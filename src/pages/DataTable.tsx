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
import NoDataRedirect from '../components/NoDataRedirect';
import Footer from '../components/Footer';
import MultiSelect from '../components/MultiSelect';
import ThemeSwitcher from '../components/ThemeSwitcher';
import styles from './DataTable.module.css';

interface TableRow {
  date: Date;
  type: 'activity' | 'transaction' | 'group_expense';
  description: string;
  amount: number;
  currency: string;
  category?: string;
  status?: string;
  recipient?: string;
  direction?: 'sent' | 'received' | 'paid' | 'request' | 'other';
  settlementStatus?: 'PAID_RECEIVED' | 'UNPAID';
  groupName?: string;
  expenseTitle?: string;
  payer?: string;
  creator?: string;
}

type ViewType = 'activity' | 'transaction' | 'group_expense';

export default function DataTable() {
  const navigate = useNavigate();
  const { parsedData } = useDataStore();

  // Determine default view based on available data
  const getDefaultView = (): ViewType => {
    if (!parsedData) return 'activity';

    // Check if there's any activity data
    const hasActivityData = parsedData.activities.length > 0;

    // If no activity data, default to transaction view
    // (BHIM, Paytm, PhonePe only have transaction data)
    if (!hasActivityData) {
      return 'transaction';
    }

    return 'activity';
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeView, setActiveView] = useState<ViewType>(getDefaultView());
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('2025');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [merchantFilter, setMerchantFilter] = useState<string[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<string[]>([]);
  const [payerFilter, setPayerFilter] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

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

    // Add group expenses (each item as a separate row)
    parsedData.groupExpenses.forEach(expense => {
      expense.items.forEach(item => {
        const displayAmount = convertToINR(item.amount);

        // Build description: handle empty titles gracefully
        let description = '';
        if (expense.title && expense.groupName) {
          description = `${expense.title} - ${expense.groupName}`;
        } else if (expense.groupName) {
          description = expense.groupName;
        } else if (expense.title) {
          description = expense.title;
        } else {
          description = 'Group Expense';
        }

        rows.push({
          date: expense.creationTime,
          type: 'group_expense',
          description,
          amount: displayAmount,
          currency: item.amount.currency,
          status: expense.state,
          settlementStatus: item.state,
          groupName: expense.groupName,
          expenseTitle: expense.title,
          direction: 'paid',
          payer: item.payer,
          creator: expense.creator,
        });
      });
    });

    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [parsedData]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(
      tableData
        .map(row => row.category)
        .filter((cat): cat is string => Boolean(cat))
    );
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

  // Filter data based on selected filters and active view
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // First filter by active view
    filtered = filtered.filter(row => row.type === activeView);

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

    // Category filter (multi-select)
    if (categoryFilter.length > 0) {
      filtered = filtered.filter(row => row.category && categoryFilter.includes(row.category));
    }

    // Direction filter (for activity view, multi-select)
    if (directionFilter.length > 0 && activeView === 'activity') {
      filtered = filtered.filter(row => row.direction && directionFilter.includes(row.direction));
    }

    // Status filter (for transaction view, multi-select)
    if (statusFilter.length > 0 && activeView === 'transaction') {
      filtered = filtered.filter(row => row.status && statusFilter.includes(row.status));
    }

    // Merchant filter (multi-select)
    if (merchantFilter.length > 0) {
      filtered = filtered.filter(row => {
        // Extract merchant name from the description
        // Same extraction logic as merchantsData
        const merchantName = row.description
          .replace(/^(PAY|COLLECT)\s*-\s*(To|From)\s+/i, '') // Remove "PAY - To " or "COLLECT - From "
          .replace(/^(To|From)\s+/i, '') // Remove "To " or "From "
          .trim();
        return merchantFilter.includes(merchantName);
      });
    }

    // Settlement status filter (only for group expenses view, multi-select)
    if (settlementFilter.length > 0 && activeView === 'group_expense') {
      filtered = filtered.filter(row => row.settlementStatus && settlementFilter.includes(row.settlementStatus));
    }

    // Payer filter (only for group expenses view, multi-select)
    if (payerFilter.length > 0 && activeView === 'group_expense') {
      filtered = filtered.filter(row => row.payer && payerFilter.includes(row.payer));
    }

    return filtered;
  }, [tableData, activeView, categoryFilter, yearFilter, monthFilter, merchantFilter, settlementFilter, payerFilter, directionFilter, statusFilter]);

  // Get unique merchants for filter (based on currently filtered data, excluding merchant filter itself)
  const merchantsData = useMemo(() => {
    // Filter data by year, month, category, and active view (but NOT merchant filter)
    let dataForMerchants = tableData;

    // Filter by active view
    dataForMerchants = dataForMerchants.filter(row => row.type === activeView);

    // Year filter
    if (yearFilter === 'lifetime') {
      // Show all data
    } else if (yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      dataForMerchants = dataForMerchants.filter(row => row.date.getFullYear() === year);
    }

    // Month filter (only applies if year is selected)
    if (monthFilter !== 'all' && yearFilter !== 'all' && yearFilter !== 'lifetime') {
      const month = parseInt(monthFilter);
      dataForMerchants = dataForMerchants.filter(row => row.date.getMonth() === month);
    }

    // Category filter
    if (categoryFilter.length > 0) {
      dataForMerchants = dataForMerchants.filter(row => row.category && categoryFilter.includes(row.category));
    }

    // Count transactions per merchant
    const merchantCounts = new Map<string, number>();
    dataForMerchants.forEach(row => {
      // Extract merchant name from the description
      // Handle formats:
      // - "To X" or "From X" (Google Pay activities)
      // - "PAY - To X" or "COLLECT - From X" (BHIM transactions)
      // - "X" (PhonePe, Paytm transactions)
      let merchantName = row.description
        .replace(/^(PAY|COLLECT)\s*-\s*(To|From)\s+/i, '') // Remove "PAY - To " or "COLLECT - From "
        .replace(/^(To|From)\s+/i, '') // Remove "To " or "From "
        .trim();

      // Filter out invalid merchant names that are just generic transaction descriptions
      // These patterns indicate no actual merchant name:
      // - "Paid ₹XXX using..."
      // - "Received ₹XXX"
      // - "Sent ₹XXX using..."
      // - Descriptions that start with currency symbols or amounts
      const isInvalid =
        /^(Paid|Received|Sent)\s+[₹$][\d,]+\.?\d*/i.test(merchantName) ||
        /^[₹$][\d,]+\.?\d*/i.test(merchantName) ||
        merchantName.startsWith('using ') ||
        merchantName === '';

      if (!isInvalid && merchantName) {
        merchantCounts.set(merchantName, (merchantCounts.get(merchantName) || 0) + 1);
      }
    });

    // Sort merchants by count (descending), then alphabetically
    const sortedMerchants = Array.from(merchantCounts.entries())
      .sort((a, b) => {
        // First sort by count (descending)
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // Then alphabetically
        return a[0].localeCompare(b[0]);
      })
      .map(([name]) => name);

    const countsRecord = Object.fromEntries(merchantCounts);

    return {
      merchants: sortedMerchants,
      counts: countsRecord,
    };
  }, [tableData, yearFilter, monthFilter, categoryFilter, activeView]);

  // Get unique payers for filter (only from group expenses)
  const payers = useMemo(() => {
    const payerSet = new Set<string>();
    tableData.forEach(row => {
      if (row.type === 'group_expense' && row.payer) {
        payerSet.add(row.payer);
      }
    });
    return Array.from(payerSet).sort();
  }, [tableData]);

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

  // Define column visibility based on active view
  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {
      date: true,
      description: true,
      amount: true,
      category: true,
    };

    // Set visibility for other columns based on active view
    if (activeView === 'activity') {
      visibility.direction = true;
      visibility.settlementStatus = false;
      visibility.payer = false;
      visibility.status = false;
      visibility.type = false;
    } else if (activeView === 'transaction') {
      visibility.direction = false;
      visibility.settlementStatus = false;
      visibility.payer = false;
      visibility.status = true;
      visibility.type = false;
    } else if (activeView === 'group_expense') {
      visibility.direction = true;
      visibility.settlementStatus = true;
      visibility.payer = true;
      visibility.status = false;
      visibility.type = false;
    }

    return visibility;
  }, [activeView]);

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
            request: { label: '↓ Request', className: styles.directionReceived },
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
      columnHelper.accessor('settlementStatus', {
        header: 'Settlement',
        cell: info => {
          const status = info.getValue();
          const row = info.row.original;

          // Only show settlement status for group expenses
          if (row.type !== 'group_expense') {
            return <span className={styles.directionBadge}>-</span>;
          }

          if (!status) return <span className={styles.directionBadge}>-</span>;

          const settlementStyles = {
            PAID_RECEIVED: { label: '✓ Paid', className: styles.settlementPaid },
            UNPAID: { label: '✗ Unpaid', className: styles.settlementUnpaid },
          };

          const config = settlementStyles[status];
          return (
            <span className={`${styles.settlementBadge} ${config.className}`}>
              {config.label}
            </span>
          );
        },
      }),
      columnHelper.accessor('payer', {
        header: 'Payer',
        cell: info => {
          const payer = info.getValue();
          const row = info.row.original;

          // Only show payer for group expenses
          if (row.type !== 'group_expense') {
            return <span className={styles.directionBadge}>-</span>;
          }

          if (!payer) return <span className={styles.directionBadge}>-</span>;

          return (
            <span className={styles.payerBadge}>
              {payer}
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
      columnVisibility,
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
    return <NoDataRedirect />;
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

  // Get view title
  const getViewTitle = () => {
    switch (activeView) {
      case 'activity':
        return 'Activity';
      case 'transaction':
        return 'Transactions';
      case 'group_expense':
        return 'Group Expenses';
      default:
        return 'All Data';
    }
  };

  // Handle view change and reset relevant filters
  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    // Reset view-specific filters
    setDirectionFilter([]);
    setStatusFilter([]);
    setSettlementFilter([]);
    setPayerFilter([]);
    setMerchantFilter([]);
  };

  return (
    <div className={styles.page}>
      {/* Sticky Navigation Header */}
      <nav className={styles.stickyNav}>
        <div className={styles.navContent}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>🔍</span>
            <span className={styles.navTitle}>Explore Data</span>
          </div>
          <div className={styles.navActions}>
            <div className={styles.navLinks}>
              <button onClick={() => navigate('/insights')} className={styles.navLink}>
                <span className={styles.navIcon}>💡</span>
                <span>Insights</span>
              </button>
              <button onClick={() => navigate('/story')} className={styles.navLink}>
                <span className={styles.navIcon}>✨</span>
                <span>Story</span>
              </button>
              <button onClick={() => navigate('/explore-data')} className={styles.navLink}>
                <span className={styles.navIcon}>🔍</span>
                <span>Explore</span>
              </button>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        {/* Compact Header */}
        <div className={styles.compactHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.compactTitle}>{getViewTitle()}</h1>
            <p className={styles.compactSubtitle}>{getPeriodLabel()}</p>
          </div>

          {/* View Tabs */}
          <div className={styles.compactTabs}>
            <button
              className={`${styles.compactTab} ${activeView === 'activity' ? styles.compactTabActive : ''}`}
              onClick={() => handleViewChange('activity')}
            >
              <span className={styles.compactTabIcon}>📱</span>
              <span className={styles.compactTabLabel}>Activity</span>
            </button>
            <button
              className={`${styles.compactTab} ${activeView === 'transaction' ? styles.compactTabActive : ''}`}
              onClick={() => handleViewChange('transaction')}
            >
              <span className={styles.compactTabIcon}>💳</span>
              <span className={styles.compactTabLabel}>Transactions</span>
            </button>
            <button
              className={`${styles.compactTab} ${activeView === 'group_expense' ? styles.compactTabActive : ''}`}
              onClick={() => handleViewChange('group_expense')}
            >
              <span className={styles.compactTabIcon}>👥</span>
              <span className={styles.compactTabLabel}>Group Expenses</span>
            </button>
          </div>
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
        {/* Common filters for all views */}
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
              setMerchantFilter([]);
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
            onChange={e => {
              setMonthFilter(e.target.value);
              setMerchantFilter([]);
            }}
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

        <MultiSelect
          label="Category"
          options={categories}
          selectedValues={categoryFilter}
          onChange={(values) => {
            setCategoryFilter(values);
            setMerchantFilter([]);
          }}
          placeholder="All Categories"
        />

        {/* Activity view specific filters */}
        {activeView === 'activity' && (
          <>
            <MultiSelect
              label="Direction"
              options={['sent', 'received', 'paid', 'request']}
              selectedValues={directionFilter}
              onChange={setDirectionFilter}
              placeholder="All Directions"
            />

            <div className="merchantFilter">
              <MultiSelect
                label={`Merchant (${merchantsData.merchants.length})`}
                options={merchantsData.merchants}
                selectedValues={merchantFilter}
                onChange={setMerchantFilter}
                placeholder="All Merchants"
                optionCounts={merchantsData.counts}
              />
            </div>
          </>
        )}

        {/* Transaction view specific filters */}
        {activeView === 'transaction' && (
          <>
            <MultiSelect
              label="Status"
              options={['Completed', 'Pending', 'Failed']}
              selectedValues={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />

            <div className="merchantFilter">
              <MultiSelect
                label={`Merchant (${merchantsData.merchants.length})`}
                options={merchantsData.merchants}
                selectedValues={merchantFilter}
                onChange={setMerchantFilter}
                placeholder="All Merchants"
                optionCounts={merchantsData.counts}
              />
            </div>
          </>
        )}

        {/* Group Expense view specific filters */}
        {activeView === 'group_expense' && (
          <>
            <MultiSelect
              label="Settlement"
              options={['PAID_RECEIVED', 'UNPAID']}
              selectedValues={settlementFilter}
              onChange={setSettlementFilter}
              placeholder="All Settlement Status"
            />

            <MultiSelect
              label={`Payer (${payers.length})`}
              options={payers}
              selectedValues={payerFilter}
              onChange={setPayerFilter}
              placeholder="All Payers"
            />
          </>
        )}

        {/* Search filter for all views */}
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

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
}
