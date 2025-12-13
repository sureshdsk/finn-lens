import styles from './Footer.module.css';

export default function Footer() {
  return (
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
          <span className={styles.disclaimerIcon}>ℹ️</span>
          Not affiliated with Google or Google Pay. This is an independent,{' '}
          <a
            href="https://github.com/sureshdsk/gpay-wrapped"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.projectLink}
          >
            open-source project
          </a>
          .
        </p>
      </div>

      <div className={styles.attribution}>
        <p className={styles.builtBy}>
          Made with ❤️ by{' '}
          <a
            href="https://www.linkedin.com/in/sureshdsk/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.authorLink}
          >
            @sureshdsk
          </a>
          {' '} | {' '}
          <a href="/about" className={styles.aboutLink}>
            About FinnLens
          </a>
        </p>
      </div>
    </footer>
  );
}
