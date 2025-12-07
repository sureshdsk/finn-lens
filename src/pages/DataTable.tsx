import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { convertToINR } from '../utils/categoryUtils';
import Tooltip from '../components/Tooltip';
import styles from './DataTable.module.css';

interface TableRow {
  date: Date;
  type: 'activity' | 'transaction';
  description: string;
  amount: number;
  currency: string;
  category?: string;
  status?: string;
  recipient?: string;
  direction?: 'sent' | 'received' | 'paid' | 'other';
}

export default function DataTable() {
  const navigate = useNavigate();
  const { parsedData } = useDataStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('2025');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Combine all data into a single table
  const tableData = useMemo((): TableRow[] => {
    if (!parsedData) return [];

    const rows: TableRow[] = [];

    // Add activities (both sent and received)
    parsedData.activities.forEach(activity => {
      if (activity.amount && activity.transactionType) {
        const isReceived = activity.transactionType === 'received';
        const displayAmount = convertToINR(activity.amount);

        rows.push({
          date: activity.time,
          type: 'activity',
          description: isReceived
            ? (activity.sender ? `From ${activity.sender}` : activity.title)
            : (activity.recipient ? `To ${activity.recipient}` : activity.title),
          amount: displayAmount,
          currency: activity.amount.currency,
          category: activity.category,
          status: 'Completed',
          recipient: activity.recipient,
          direction: activity.transactionType,
        });
      }
    });

    // Add transactions
    parsedData.transactions.forEach(transaction => {
      rows.push({
        date: transaction.time,
        type: 'transaction',
        description: transaction.description,
        amount: convertToINR(transaction.amount),
        currency: transaction.amount.currency,
        category: transaction.category,
        status: transaction.status,
        recipient: transaction.description,
      });
    });

    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [parsedData]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(tableData.map(row => row.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [tableData]);

  // Get unique years from data
  const years = useMemo(() => {
    const yearsSet = new Set(tableData.map(row => row.date.getFullYear()));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [tableData]);

  // Get months
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // Year filter
    if (yearFilter === 'lifetime') {
      // Show all data
    } else if (yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      filtered = filtered.filter(row => row.date.getFullYear() === year);
    }

    // Month filter (only applies if year is selected)
    if (monthFilter !== 'all' && yearFilter !== 'all' && yearFilter !== 'lifetime') {
      const month = parseInt(monthFilter);
      filtered = filtered.filter(row => row.date.getMonth() === month);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(row => row.category === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(row => row.type === typeFilter);
    }

    return filtered;
  }, [tableData, categoryFilter, typeFilter, yearFilter, monthFilter]);

  // Calculate totals with direction awareness
  const totals = useMemo(() => {
    const sent = filteredData
      .filter(row => row.direction === 'sent' || row.direction === 'paid' || !row.direction)
      .reduce((sum, row) => sum + row.amount, 0);

    const received = filteredData
      .filter(row => row.direction === 'received')
      .reduce((sum, row) => sum + row.amount, 0);

    const netFlow = received - sent;

    return {
      sent,
      received,
      netFlow,
      count: filteredData.length,
      average: filteredData.length > 0 ? sent / filteredData.length : 0,
    };
  }, [filteredData]);

  // Define columns
  const columnHelper = createColumnHelper<TableRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: 'Date & Time',
        cell: info => {
          const date = info.getValue();
          return (
            <div className={styles.dateTimeCell}>
              <div className={styles.dateText}>
                {date.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className={styles.timeText}>
                {date.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const dateA = rowA.getValue<Date>(columnId);
          const dateB = rowB.getValue<Date>(columnId);
          return dateA.getTime() - dateB.getTime();
        },
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: info => (
          <Tooltip content={info.getValue()}>
            <div className={styles.descriptionCell}>
              <span className={styles.descriptionText}>
                {info.getValue()}
              </span>
            </div>
          </Tooltip>
        ),
      }),
      columnHelper.accessor('direction', {
        header: 'Direction',
        cell: info => {
          const direction = info.getValue();
          if (!direction) return <span className={styles.directionBadge}>-</span>;

          const directionStyles = {
            sent: { label: '↑ Sent', className: styles.directionSent },
            paid: { label: '↑ Paid', className: styles.directionPaid },
            received: { label: '↓ Received', className: styles.directionReceived },
            other: { label: '-', className: styles.directionOther },
          };

          const config = directionStyles[direction] || directionStyles.other;
          return (
            <span className={`${styles.directionBadge} ${config.className}`}>
              {config.label}
            </span>
          );
        },
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: info => {
          const row = info.row.original;
          const amount = info.getValue();
          const isReceived = row.direction === 'received';

          return (
            <div className={`${styles.amountCell} ${isReceived ? styles.amountReceived : styles.amountSent}`}>
              {isReceived ? '+' : '-'}₹{amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          );
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: info => (
          <span className={styles.categoryBadge}>
            {info.getValue() || 'Uncategorized'}
          </span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: info => (
          <span className={`${styles.typeBadge} ${styles[info.getValue()]}`}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <span className={`${styles.statusBadge} ${styles[info.getValue()?.toLowerCase() || 'unknown']}`}>
            {info.getValue() || 'N/A'}
          </span>
        ),
      }),
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (!parsedData) {
    navigate('/');
    return null;
  }

  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(2)}K`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Get period label for header
  const getPeriodLabel = () => {
    if (yearFilter === 'lifetime') return 'Lifetime';
    if (yearFilter === 'all') return 'All Time';
    if (monthFilter !== 'all') {
      const monthName = months.find(m => m.value === monthFilter)?.label || '';
      return `${monthName} ${yearFilter}`;
    }
    return yearFilter;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Spending Data</h1>
          <p className={styles.subtitle}>{getPeriodLabel()}</p>
        </div>
        <button onClick={() => navigate('/story')} className={styles.backButton}>
          ← Back to Story
        </button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Money Sent</div>
          <div className={`${styles.summaryValue} ${styles.amountSent}`}>
            -{formatAmount(totals.sent)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Money Received</div>
          <div className={`${styles.summaryValue} ${styles.amountReceived}`}>
            +{formatAmount(totals.received)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Net Flow</div>
          <div className={`${styles.summaryValue} ${totals.netFlow >= 0 ? styles.amountReceived : styles.amountSent}`}>
            {totals.netFlow >= 0 ? '+' : ''}{formatAmount(Math.abs(totals.netFlow))}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Transactions</div>
          <div className={styles.summaryValue}>{totals.count}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="year-filter" className={styles.filterLabel}>
            Time Period:
          </label>
          <select
            id="year-filter"
            value={yearFilter}
            onChange={e => {
              setYearFilter(e.target.value);
              if (e.target.value === 'lifetime' || e.target.value === 'all') {
                setMonthFilter('all');
              }
            }}
            className={styles.filterSelect}
          >
            <option value="lifetime">Lifetime</option>
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="month-filter" className={styles.filterLabel}>
            Month:
          </label>
          <select
            id="month-filter"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className={styles.filterSelect}
            disabled={yearFilter === 'lifetime' || yearFilter === 'all'}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="category-filter" className={styles.filterLabel}>
            Category:
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="type-filter" className={styles.filterLabel}>
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="activity">Activity</option>
            <option value="transaction">Transaction</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="search" className={styles.filterLabel}>
            Search:
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search description..."
            value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('description')?.setFilterValue(e.target.value)}
            className={styles.filterInput}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={styles.th}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className={styles.thContent}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className={styles.sortIndicator}>
                          {header.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={styles.tbody}>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={styles.tr}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={styles.td}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className={styles.emptyState}>
            <p>No transactions found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className={styles.paginationButton}
        >
          {'<<'}
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className={styles.paginationButton}
        >
          {'<'}
        </button>
        <span className={styles.paginationInfo}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className={styles.paginationButton}
        >
          {'>'}
        </button>
        <button
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
          className={styles.paginationButton}
        >
          {'>>'}
        </button>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className={styles.pageSizeSelect}
        >
          {[10, 20, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
