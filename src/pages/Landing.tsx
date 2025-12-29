import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropZone from '../components/upload/DropZone';
import ThemeSwitcher from '../components/ThemeSwitcher';
import styles from './Landing.module.css';

export default function Landing() {
  const [uploading, setUploading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (files: File[]) => {
    setUploading(true);

    // Pass files via navigation state
    try {
      navigate('/processing', { state: { files } });
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      alert('Failed to process files. Please try again.');
    }
  };

  return (
    <div className={styles.landing}>
      <div className={styles.themeSwitcherContainer}>
        <ThemeSwitcher />
      </div>

      <a
        href="https://www.producthunt.com/products/finnlens-your-year-in-payments?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-finnlens-your-year-in-payments-wrapped"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.productHuntBadge}
        aria-label="FinnLens - Your Year in Payments Wrapped on Product Hunt"
      >
        <img
          alt="FinnLens - Your Year in Payments Wrapped - Like Spotify Wrapped but for UPI transactions - 100% private | Product Hunt"
          width="250"
          height="54"
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1054571&theme=light&t=1767024246276"
        />
      </a>

      <a
        href="https://github.com/sureshdsk/finn-lens"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.githubButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        Star on GitHub
      </a>

      <header className={styles.header}>
        <h1 className={styles.title}>FinnLens 🔍</h1>
        <p className={styles.subtitle}>Your year in payments, privacy-first</p>
      </header>

      <main className={styles.main}>
        <DropZone onUpload={handleFileUpload} disabled={uploading} />

        <button
          className={styles.exportGuideButton}
          onClick={() => setShowExportModal(true)}
        >
          📥 How to export your data
        </button>
      </main>

      <footer className={styles.footer}>

        <div className={styles.privacyBadge}>
          <span className={styles.badgeIcon}>🔒</span>
          <div className={styles.badgeContent}>
            <strong className={styles.badgeTitle}>100% Private & Offline</strong>
            <p className={styles.badgeText}>Your data never leaves your browser</p>
          </div>
        </div>

        <div className={styles.disclaimers}>
          <p className={styles.disclaimer}>
            <span>
              Not affiliated with Google, Google Pay, BHIM, Paytm, or PhonePe.
              <br />
              This is an independent{' '}
              <a
                href="https://github.com/sureshdsk/finn-lens"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.projectLink}
              >
                open-source project
              </a>
              .
            </span>
          </p>
        </div>

        <div className={styles.attribution}>
          <p className={styles.builtBy}>
            Made with ❤️ by <a href="https://www.linkedin.com/in/sureshdsk/" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>@sureshdsk</a>
            {'  '} | {'  '}
            <a href="/about" className={styles.aboutLink}>About FinnLens</a>
          </p>
        </div>
      </footer>

      {showExportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>📥 How to export your data</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowExportModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <details className={styles.appAccordion} open>
                <summary className={styles.appSummary}>
                  <span className={styles.appIcon}>💳</span>
                  <span className={styles.appLabel}>Google Pay</span>
                  <span className={styles.fileFormat}>.ZIP</span>
                </summary>
                <ol className={styles.howToSteps}>
                  <li className={styles.howToStep}>Visit <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" className={styles.howToLink}>Google Takeout</a></li>
                  <li className={styles.howToStep}>Select only "Google Pay" from the list</li>
                  <li className={styles.howToStep}>Download your data as a ZIP file</li>
                </ol>
              </details>

              <details className={styles.appAccordion}>
                <summary className={styles.appSummary}>
                  <span className={styles.appIcon}>🏦</span>
                  <span className={styles.appLabel}>BHIM App</span>
                  <span className={styles.fileFormat}>.HTML</span>
                </summary>
                <ol className={styles.howToSteps}>
                  <li className={styles.howToStep}>Open BHIM app and go to Transaction History</li>
                  <li className={styles.howToStep}>Export as HTML file</li>
                </ol>
              </details>

              <details className={styles.appAccordion}>
                <summary className={styles.appSummary}>
                  <span className={styles.appIcon}>💰</span>
                  <span className={styles.appLabel}>Paytm</span>
                  <span className={styles.alphaBadge}>Alpha</span>
                  <span className={styles.fileFormat}>.XLSX</span>
                </summary>
                <ol className={styles.howToSteps}>
                  <li className={styles.howToStep}>Open Paytm app → Passbook</li>
                  <li className={styles.howToStep}>Tap on "Download Statement"</li>
                  <li className={styles.howToStep}>Select date range and export as XLSX file</li>
                </ol>
              </details>

              <details className={styles.appAccordion}>
                <summary className={styles.appSummary}>
                  <span className={styles.appIcon}>📱</span>
                  <span className={styles.appLabel}>PhonePe</span>
                  <span className={styles.alphaBadge}>Alpha</span>
                  <span className={styles.fileFormat}>.PDF</span>
                </summary>
                <ol className={styles.howToSteps}>
                  <li className={styles.howToStep}>Open PhonePe app → History</li>
                  <li className={styles.howToStep}>Tap on "Download Statement"</li>
                  <li className={styles.howToStep}>Select date range and download as PDF</li>
                </ol>
              </details>

              <div className={styles.modalFooter}>
                <p className={styles.multiFileNote}>
                  💡 You can upload files from multiple apps at once!
                </p>

                <p className={styles.alphaNotice}>
                  ⚠️ Paytm and PhonePe are in alpha - accuracy may vary
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
