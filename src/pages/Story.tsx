import { useDataStore } from '../stores/dataStore';
import { useNavigate } from 'react-router-dom';
import styles from './Story.module.css';

export default function Story() {
  const navigate = useNavigate();
  const { parsedData, insights, selectedYear } = useDataStore();

  if (!parsedData) {
    navigate('/');
    return null;
  }

  return (
    <div className={styles.story}>
      <div className={styles.container}>
        <h1 className={styles.title}>Your GPay Wrapped {selectedYear === 'all' ? '(All Time)' : selectedYear}</h1>

        <div className={styles.debugInfo}>
          <h2>Data Loaded Successfully! 🎉</h2>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{parsedData.transactions.length}</div>
              <div className={styles.statLabel}>Transactions</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{parsedData.groupExpenses.length}</div>
              <div className={styles.statLabel}>Group Expenses</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{parsedData.cashbackRewards.length}</div>
              <div className={styles.statLabel}>Cashback Rewards</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{parsedData.voucherRewards.length}</div>
              <div className={styles.statLabel}>Vouchers</div>
            </div>
          </div>

          <div className={styles.insightsSection}>
            <h2>{insights.length} Insights Generated</h2>
            {insights.length > 0 ? (
              <div className={styles.insightsList}>
                {insights.map((insight, index) => (
                  <div key={index} className={styles.insightCard}>
                    <h3 className={styles.insightTitle}>{insight.title}</h3>
                    <p className={styles.insightMessage}>{insight.message}</p>
                    <div className={styles.insightMeta}>
                      <span className={styles.insightType}>{insight.type}</span>
                      {insight.tone && <span className={styles.insightTone}>{insight.tone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noInsights}>No insights generated for this time period.</p>
            )}
          </div>

          <p className={styles.message}>
            Story mode UI with swipeable cards will be implemented in Phase 3!<br />
            For now, you can see your insights have been calculated.
          </p>

          <button onClick={() => navigate('/')} className={styles.backButton}>
            Upload Another File
          </button>
        </div>
      </div>
    </div>
  );
}
