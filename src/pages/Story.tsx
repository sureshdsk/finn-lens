import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useNavigate } from 'react-router-dom';
import { convertToINR, TransactionCategory, categorizeTransaction } from '../utils/categoryUtils';
import {
  filterTransactionsByYear,
  filterActivitiesByYear,
  filterGroupExpensesByYear,
  filterCashbackRewardsByYear,
  filterVouchersByYear,
} from '../utils/dateUtils';
import NoDataRedirect from '../components/NoDataRedirect';
import Footer from '../components/Footer';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { animate as anime } from 'animejs';
import styles from './Story.module.css';

export default function Story() {
  const navigate = useNavigate();
  const { parsedData, insights, filterContext } = useDataStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Filter ALL data by selected year
  const filteredData = useMemo(() => {
    if (!parsedData) return null;
    return {
      transactions: filterTransactionsByYear(parsedData.transactions, filterContext.year),
      activities: filterActivitiesByYear(parsedData.activities, filterContext.year),
      groupExpenses: filterGroupExpensesByYear(parsedData.groupExpenses, filterContext.year),
      cashbackRewards: filterCashbackRewardsByYear(parsedData.cashbackRewards, filterContext.year),
      voucherRewards: filterVouchersByYear(parsedData.voucherRewards, filterContext.year),
    };
  }, [parsedData, filterContext.year]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    if (!filteredData) return 0;

    // Sum from transactions
    const transactionTotal = filteredData.transactions.reduce(
      (sum, t) => sum + convertToINR(t.amount),
      0
    );

    // Sum from activities (sent and paid only)
    const activityTotal = filteredData.activities
      .filter(a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid'))
      .reduce((sum, a) => sum + convertToINR(a.amount!), 0);

    return transactionTotal + activityTotal;
  }, [filteredData]);

  // Calculate total received
  const totalReceived = useMemo(() => {
    if (!filteredData) return 0;
    return filteredData.activities
      .filter(a => a.amount && a.transactionType === 'received')
      .reduce((sum, a) => sum + convertToINR(a.amount!), 0);
  }, [filteredData]);

  // Format amount helper
  const formatAmount = useCallback((amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return Math.round(amount).toLocaleString();
  }, []);

  // Category icons and colors
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

  // Calculate category data
  const categoryData = useMemo(() => {
    if (!filteredData) return [];

    const allItemsWithCategory: { category: TransactionCategory; amount: number }[] = [
      ...filteredData.transactions.map(t => ({
        category: categorizeTransaction(t.description),
        amount: convertToINR(t.amount),
      })),
      ...filteredData.activities
        .filter(a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid'))
        .map(a => ({
          category: categorizeTransaction(a.title),
          amount: convertToINR(a.amount!),
        })),
    ];

    const categoryMap = new Map<TransactionCategory, { total: number; count: number }>();
    allItemsWithCategory.forEach(item => {
      const existing = categoryMap.get(item.category) || { total: 0, count: 0 };
      existing.total += item.amount;
      existing.count++;
      categoryMap.set(item.category, existing);
    });

    const grandTotal = allItemsWithCategory.reduce((sum, item) => sum + item.amount, 0);

    return Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        amount: stats.total,
        count: stats.count,
        percentage: grandTotal > 0 ? (stats.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6); // Top 6 categories for cleaner layout
  }, [filteredData]);

  // Animate on mount
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
          const increment = totalSpent / 60; // 60 frames for smooth animation
          const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= totalSpent) {
              currentValue = totalSpent;
              clearInterval(timer);
            }
            amountElement.innerHTML = `₹${formatAmount(Math.round(currentValue))}`;
          }, 16); // ~60fps
        };
        setTimeout(animateCounter, 500);
      }
    }

    // Stats cards animation
    if (statsRef.current) {
      const statCards = Array.from(statsRef.current.querySelectorAll(`.${styles.statCard}`));
      statCards.forEach((card, index) => {
        anime(card, {
          opacity: [0, 1],
          y: [30, 0],
          delay: 800 + (index * 150),
          duration: 800,
          ease: 'out(3)',
        });

        // Animate stat numbers
        const numberEl = card.querySelector(`.${styles.statNumber}`);
        if (numberEl) {
          const targetValue = parseInt(numberEl.textContent || '0');
          let current = 0;
          const increment = targetValue / 45;
          setTimeout(() => {
            const timer = setInterval(() => {
              current += increment;
              if (current >= targetValue) {
                current = targetValue;
                clearInterval(timer);
              }
              numberEl.innerHTML = Math.round(current).toString();
            }, 16);
          }, 1000 + (index * 150));
        }
      });
    }

    // Insights animation
    if (insightsRef.current) {
      const insightCards = Array.from(insightsRef.current.querySelectorAll(`.${styles.insightCard}`));
      insightCards.forEach((card, index) => {
        anime(card, {
          opacity: [0, 1],
          scale: [0.8, 1],
          y: [20, 0],
          delay: 1500 + (index * 100),
          duration: 600,
          ease: 'out(3)',
        });
      });
    }

    // Categories animation
    if (categoriesRef.current) {
      const categoryCards = Array.from(categoriesRef.current.querySelectorAll(`.${styles.categoryCard}`));
      categoryCards.forEach((card, index) => {
        anime(card, {
          opacity: [0, 1],
          y: [30, 0],
          delay: 2000 + (index * 100),
          duration: 600,
          ease: 'out(3)',
        });
      });
    }
  }, [totalSpent, filteredData, formatAmount]);

  if (!parsedData) {
    return <NoDataRedirect />;
  }

  const totalPayments = (filteredData?.activities.length ?? 0) + (filteredData?.transactions.length ?? 0);
  const netFlow = totalReceived - totalSpent;

  return (
    <div className={styles.story} ref={containerRef}>
      {/* Sticky Navigation Header */}
      <nav className={styles.stickyNav}>
        <div className={styles.navContent}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>💸</span>
            <span className={styles.navTitle}>FinnLens</span>
          </div>
          <div className={styles.navActions}>
            <div className={styles.navLinks}>
              <button onClick={() => navigate('/insights')} className={`${styles.navLink} ${styles.active}`}>
                <span className={styles.navIcon}>💡</span>
                <span>Insights</span>
              </button>
              <button onClick={() => navigate('/story')} className={styles.navLink}>
                <span className={styles.navIcon}>✨</span>
                <span>Story</span>
              </button>
              <button onClick={() => navigate('/categories')} className={styles.navLink}>
                <span className={styles.navIcon}>🏷️</span>
                <span>Categories</span>
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
        {/* Hero Section */}
        <div className={styles.hero} ref={heroRef}>
          <div className={styles.heroIcon}>💸</div>
          <h1 className={styles.heroTitle}>
            Your payments in a year, wrapped!
          </h1>
          <div className={styles.heroYear}>
            {filterContext.year === 'all' ? 'All Time' : filterContext.year}
          </div>
          <div className={styles.heroAmountWrapper}>
            <div className={styles.heroLabel}>Total Spent</div>
            <div className={styles.heroAmount}>₹0</div>
          </div>
          {totalReceived > 0 && (
            <div className={styles.heroSubAmount}>
              <span className={styles.receivedLabel}>Received:</span>
              <span className={styles.receivedAmount}>+₹{formatAmount(totalReceived)}</span>
              {netFlow !== 0 && (
                <span className={`${styles.netFlow} ${netFlow > 0 ? styles.positive : styles.negative}`}>
                  {netFlow > 0 ? '+' : ''}₹{formatAmount(Math.abs(netFlow))} net
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid} ref={statsRef}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💳</div>
            <div className={styles.statNumber}>{totalPayments}</div>
            <div className={styles.statLabel}>Transactions</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statNumber}>{filteredData?.groupExpenses.length ?? 0}</div>
            <div className={styles.statLabel}>Group Expenses</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎁</div>
            <div className={styles.statNumber}>{filteredData?.voucherRewards.length ?? 0}</div>
            <div className={styles.statLabel}>Vouchers</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>💡</div>
            <div className={styles.statNumber}>{insights.length}</div>
            <div className={styles.statLabel}>Insights</div>
          </div>
        </div>

        {/* Insights Section */}
        <div className={styles.insightsSection} ref={insightsRef}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>✨</span>
            Your Insights
            <span className={styles.insightCount}>{insights.length}</span>
          </h2>
          {insights.length > 0 ? (
            <div className={styles.insightsList}>
              {insights.map((insight, index) => {
                // Get icon based on insight type
                const getInsightIcon = (type: string) => {
                  const icons: Record<string, string> = {
                    money_flow: '💸',
                    spending_category: '📊',
                    peak_activity: '⏰',
                    transaction_partner: '👥',
                    expensive_day: '💰',
                    voucher_hoarder: '🎁',
                    group_expense: '👨‍👩‍👧‍👦',
                    cashback_hunter: '🎯',
                    payment_streak: '🔥',
                    night_owl: '🦉',
                    funny: '😄',
                  };
                  return icons[type] || '💡';
                };

                return (
                  <div key={index} className={styles.insightCard}>
                    <div className={styles.insightIconBadge}>
                      <span className={styles.insightEmoji}>{getInsightIcon(insight.type)}</span>
                    </div>
                    <div className={styles.insightHeader}>
                      <h3 className={styles.insightTitle}>{insight.title}</h3>
                      {insight.tone && (
                        <span className={`${styles.insightTone} ${styles[insight.tone]}`}>
                          {insight.tone}
                        </span>
                      )}
                    </div>
                    <p className={styles.insightMessage}>{insight.message}</p>
                    <div className={styles.insightFooter}>
                      <span className={styles.insightType}>
                        {insight.type.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.insightNumber}>#{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.noInsights}>
              <div className={styles.noInsightsIcon}>📊</div>
              <p>No insights generated for this time period.</p>
              <button onClick={() => navigate('/')} className={styles.uploadAgainButton}>
                Upload Data
              </button>
            </div>
          )}
        </div>

        {/* Categories Section */}
        {categoryData.length > 0 && (
          <div className={styles.categoriesSection} ref={categoriesRef}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.titleIcon}>🏷️</span>
              Top Categories
            </h2>
            <div className={styles.categoryGrid}>
              {categoryData.map((item) => (
                <div key={item.category} className={styles.categoryCard}>
                  <div className={styles.categoryCardHeader}>
                    <span className={styles.categoryCardIcon}>
                      {CATEGORY_ICONS[item.category]}
                    </span>
                    <span className={styles.categoryCardName}>{item.category}</span>
                  </div>
                  <div className={styles.categoryCardAmount}>
                    ₹{formatAmount(item.amount)}
                  </div>
                  <div className={styles.categoryCardFooter}>
                    <span className={styles.categoryCardCount}>
                      {item.count} transaction{item.count !== 1 ? 's' : ''}
                    </span>
                    <span className={styles.categoryCardPercentage}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.exploreSection}>
              <button onClick={() => navigate('/explore-data')} className={styles.exploreButton}>
                <span className={styles.exploreIcon}>🔍</span>
                <span>View All Transactions</span>
                <span className={styles.exploreArrow}>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <Footer />

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
