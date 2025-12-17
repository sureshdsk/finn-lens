import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useNavigate } from 'react-router-dom';
import { convertToINR, TransactionCategory, categorizeTransaction } from '../utils/categoryUtils';
import { filterTransactionsByYear, filterActivitiesByYear } from '../utils/dateUtils';
import { Currency } from '../types/data.types';
import NoDataRedirect from '../components/NoDataRedirect';
import Footer from '../components/Footer';
import ThemeSwitcher from '../components/ThemeSwitcher';
import FilterBar from '../components/filters/FilterBar';
import { animate as anime } from 'animejs';
import styles from './Categories.module.css';

interface TransactionItem {
  description: string;
  amount: Currency;
  date: Date;
  source: 'transaction' | 'activity';
}

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Food: '#FF6B6B',
  Groceries: '#4ECDC4',
  Clothing: '#A855F7',
  Entertainment: '#F97316',
  'E-commerce': '#3B82F6',
  'Travel & Transport': '#10B981',
  'Utilities & Bills': '#6366F1',
  'Bills & Utilities': '#6366F1',
  Healthcare: '#EC4899',
  Education: '#14B8A6',
  Investments: '#22C55E',
  'Investment & Finance': '#22C55E',
  Transfers: '#8B5CF6',
  'Bank Transfers': '#0EA5E9',
  'Transfers & Payments': '#0EA5E9',
  'Services & Miscellaneous': '#94A3B8',
  Others: '#94A3B8',
};

const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  Food: '🍕',
  Groceries: '🛒',
  Clothing: '👕',
  Entertainment: '🎬',
  'E-commerce': '🛍️',
  'Travel & Transport': '🚗',
  'Utilities & Bills': '💡',
  'Bills & Utilities': '💡',
  Healthcare: '🏥',
  Education: '📚',
  Investments: '📈',
  'Investment & Finance': '📈',
  Transfers: '💸',
  'Bank Transfers': '🏦',
  'Transfers & Payments': '🏦',
  'Services & Miscellaneous': '📦',
  Others: '📦',
};

export default function Categories() {
  const navigate = useNavigate();
  const { parsedData, filterContext } = useDataStore();
  const [expandedCategory, setExpandedCategory] = useState<TransactionCategory | null>(null);

  // Get all items with their category
  const allItemsWithCategory = useMemo(() => {
    if (!parsedData) return [];

    const filteredTransactions = filterTransactionsByYear(parsedData.transactions, filterContext.year);
    const filteredActivities = filterActivitiesByYear(parsedData.activities, filterContext.year);

    const items: (TransactionItem & { category: TransactionCategory })[] = [
      ...filteredTransactions.map(t => ({
        description: t.description,
        amount: t.amount,
        date: t.time,
        source: 'transaction' as const,
        category: categorizeTransaction(t.description),
      })),
      ...filteredActivities
        .filter(a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid'))
        .map(a => ({
          description: a.title,
          amount: a.amount!,
          date: a.time,
          source: 'activity' as const,
          category: categorizeTransaction(a.title),
        })),
    ];

    return items;
  }, [parsedData, filterContext.year]);

  const categoryData = useMemo(() => {
    if (allItemsWithCategory.length === 0) return [];

    // Group by category
    const categoryMap = new Map<TransactionCategory, { total: number; count: number }>();

    allItemsWithCategory.forEach(item => {
      const existing = categoryMap.get(item.category) || { total: 0, count: 0 };
      existing.total += convertToINR(item.amount);
      existing.count++;
      categoryMap.set(item.category, existing);
    });

    const grandTotal = allItemsWithCategory.reduce(
      (sum, item) => sum + convertToINR(item.amount),
      0
    );

    return Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        amount: stats.total,
        count: stats.count,
        percentage: grandTotal > 0 ? (stats.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [allItemsWithCategory]);

  // Get transactions for a specific category
  const getTransactionsForCategory = (category: TransactionCategory) => {
    return allItemsWithCategory
      .filter(item => item.category === category)
      .sort((a, b) => convertToINR(b.amount) - convertToINR(a.amount));
  };

  const totalSpent = useMemo(() => {
    return categoryData.reduce((sum, cat) => sum + cat.amount, 0);
  }, [categoryData]);

  if (!parsedData) {
    return <NoDataRedirect />;
  }

  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return Math.round(amount).toLocaleString();
  };

  // Limit to top 10 categories
  const top10Categories = useMemo(() => {
    return categoryData.slice(0, 10);
  }, [categoryData]);

  const remainingCategories = categoryData.length - 10;

  // Animations
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Hero animation
    if (heroRef.current) {
      anime(heroRef.current, {
        opacity: [0, 1],
        y: [-50, 0],
        duration: 1200,
        ease: 'out(3)',
      });

      // Animate the amount with counting effect
      const amountElement = heroRef.current.querySelector(`.${styles.heroAmount}`);
      if (amountElement) {
        let currentValue = 0;
        const animateCounter = () => {
          const increment = totalSpent / 60;
          const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= totalSpent) {
              currentValue = totalSpent;
              clearInterval(timer);
            }
            amountElement.innerHTML = `₹${formatAmount(Math.round(currentValue))}`;
          }, 16);
        };
        setTimeout(animateCounter, 500);
      }
    }

    // Category cards animation
    if (categoriesRef.current) {
      const categoryCards = Array.from(categoriesRef.current.querySelectorAll(`.${styles.categoryCard}`));
      categoryCards.forEach((card, index) => {
        anime(card, {
          opacity: [0, 1],
          y: [30, 0],
          delay: 800 + (index * 100),
          duration: 600,
          ease: 'out(3)',
        });
      });
    }
  }, [totalSpent]);

  return (
    <div className={styles.categories} ref={containerRef}>
      {/* Sticky Navigation Header */}
      <nav className={styles.stickyNav}>
        <div className={styles.navContent}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>🏷️</span>
            <span className={styles.navTitle}>Categories</span>
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
        {/* Filter Bar */}
        <FilterBar />

        {/* Hero Section */}
        <div className={styles.hero} ref={heroRef}>
          <div className={styles.heroIcon}>🏷️</div>
          <h1 className={styles.heroTitle}>
            Spending Categories
          </h1>
          <div className={styles.heroYear}>
            {filterContext.year === 'all' ? 'All Time' : filterContext.year}
          </div>
          <div className={styles.heroAmountWrapper}>
            <div className={styles.heroLabel}>Total Spent</div>
            <div className={styles.heroAmount}>₹0</div>
          </div>
        </div>

        {/* Top 10 Categories */}
        <div className={styles.categoriesSection} ref={categoriesRef}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>📊</span>
            Top 10 Categories
            {categoryData.length > 10 && (
              <span className={styles.categoryCount}>
                {categoryData.length} total
              </span>
            )}
          </h2>

          {top10Categories.length > 0 ? (
            <div className={styles.categoryList}>
              {top10Categories.map((item, index) => {
                const isExpanded = expandedCategory === item.category;
                const transactions = isExpanded ? getTransactionsForCategory(item.category) : [];

                return (
                  <div
                    key={item.category}
                    className={`${styles.categoryCard} ${isExpanded ? styles.expanded : ''}`}
                    style={{
                      '--category-color': CATEGORY_COLORS[item.category],
                    } as React.CSSProperties}
                  >
                    <div className={styles.categoryRank}>#{index + 1}</div>
                    <div
                      className={styles.categoryHeader}
                      onClick={() => setExpandedCategory(isExpanded ? null : item.category)}
                    >
                      <span className={styles.categoryIcon}>
                        {CATEGORY_ICONS[item.category]}
                      </span>
                      <span className={styles.categoryName}>{item.category}</span>
                      <span className={styles.categoryPercentage}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: CATEGORY_COLORS[item.category],
                        }}
                      />
                    </div>

                    <div className={styles.categoryDetails}>
                      <span className={styles.categoryAmount}>
                        ₹{formatAmount(item.amount)}
                      </span>
                      <span className={styles.categoryCount}>
                        {item.count} transaction{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className={styles.transactionList}>
                        <div className={styles.transactionListHeader}>
                          <span>Top Transactions</span>
                          <span>{transactions.length} items</span>
                        </div>
                        {transactions.slice(0, 5).map((txn, txnIndex) => (
                          <div key={txnIndex} className={styles.transactionItem}>
                            <div className={styles.transactionInfo}>
                              <span className={styles.transactionDesc}>
                                {txn.description.length > 40
                                  ? txn.description.substring(0, 40) + '...'
                                  : txn.description}
                              </span>
                              <span className={styles.transactionMeta}>
                                {txn.date.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <span className={styles.transactionAmount}>
                              ₹{formatAmount(convertToINR(txn.amount))}
                            </span>
                          </div>
                        ))}
                        {transactions.length > 5 && (
                          <div className={styles.moreItems}>
                            +{transactions.length - 5} more • Click "Explore All Data" to see everything
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.noData}>
              <div className={styles.noDataIcon}>📊</div>
              <p>No spending data found for this period.</p>
              <button onClick={() => navigate('/')} className={styles.uploadAgainButton}>
                Upload Data
              </button>
            </div>
          )}

          {/* Explore All Data Button */}
          {categoryData.length > 0 && (
            <div className={styles.exploreSection}>
              {remainingCategories > 0 && (
                <p className={styles.exploreHint}>
                  +{remainingCategories} more categor{remainingCategories === 1 ? 'y' : 'ies'} available
                </p>
              )}
              <button onClick={() => navigate('/explore-data')} className={styles.exploreButton}>
                <span className={styles.exploreIcon}>🔍</span>
                <span>Explore All Data</span>
                <span className={styles.exploreArrow}>→</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/* Floating particles background */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }} />
        ))}
      </div>
    </div>
  );
}
