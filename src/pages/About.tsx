import { useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import styles from './About.module.css';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className={styles.about}>
      {/* Sticky Navigation Header */}
      <nav className={styles.stickyNav}>
        <div className={styles.navContent}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>ℹ️</span>
            <span className={styles.navTitle}>About</span>
          </div>
          <div className={styles.navActions}>
            <button onClick={() => navigate('/')} className={styles.navLink}>
              <span className={styles.navIcon}>🏠</span>
              <span>Home</span>
            </button>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        <div className={styles.content}>
          {/* Hero */}
          <div className={styles.hero}>
            <h1 className={styles.title}>About FinnLens</h1>
            <p className={styles.subtitle}>
              Your year in payments, visualized with privacy
            </p>
          </div>

          {/* Story */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>💡</span> The Story
            </h2>
            <div className={styles.text}>
              <p>
                Ever wondered how you spend money through Google Pay? Inspired by Spotify Wrapped's
                year-in-review magic, we were curious to understand our own payment patterns, habits,
                and quirks.
              </p>
              <p>
                So we built FinnLens — a privacy-first tool that turns your Google Pay transaction
                history into beautiful, shareable insights. All processing happens entirely in your
                browser. Your data never leaves your device.
              </p>
            </div>
          </section>

          {/* Built at build2learn */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>🏗️</span> Built at build2learn
            </h2>
            <div className={styles.text}>
              <p>
                This project came to life at{' '}
                <a
                  href="https://build2learn.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  build2learn
                </a>
                , a vibrant community in Chennai where creators, students, and professionals
                collaborate on real-world projects.
              </p>
              <p>
                At build2learn, we believe in learning by doing — transforming ideas into reality
                through hands-on collaboration, mentorship, and a supportive environment.
              </p>
            </div>
          </section>

          {/* Development */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>⚡</span> Development
            </h2>
            <div className={styles.text}>
              <p>
                We vibe-coded this entire project with{' '}
                <a
                  href="https://claude.ai/code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Claude Code
                </a>
                , leveraging AI-powered development to move fast and iterate quickly.
              </p>
              <p>
                The experience felt like coding with antigravity — ideas flowed into working features
                with minimal friction.
              </p>
            </div>
          </section>

          {/* Tech Stack */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>🛠️</span> Tech Stack
            </h2>
            <div className={styles.techGrid}>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>⚛️</div>
                <div className={styles.techName}>React 19</div>
                <div className={styles.techDesc}>UI Framework</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>📘</div>
                <div className={styles.techName}>TypeScript</div>
                <div className={styles.techDesc}>Type Safety</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>⚡</div>
                <div className={styles.techName}>Vite</div>
                <div className={styles.techDesc}>Build Tool</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>🐻</div>
                <div className={styles.techName}>Zustand</div>
                <div className={styles.techDesc}>State Management</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>🎨</div>
                <div className={styles.techName}>Tailwind CSS</div>
                <div className={styles.techDesc}>Styling</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>📊</div>
                <div className={styles.techName}>TanStack Table</div>
                <div className={styles.techDesc}>Data Tables</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>🎬</div>
                <div className={styles.techName}>Anime.js</div>
                <div className={styles.techDesc}>Animations</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>📦</div>
                <div className={styles.techName}>JSZip</div>
                <div className={styles.techDesc}>ZIP Processing</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>📄</div>
                <div className={styles.techName}>PapaParse</div>
                <div className={styles.techDesc}>CSV Parsing</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>📸</div>
                <div className={styles.techName}>html2canvas</div>
                <div className={styles.techDesc}>Image Export</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>✅</div>
                <div className={styles.techName}>Vitest</div>
                <div className={styles.techDesc}>Testing</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>🔍</div>
                <div className={styles.techName}>Chrome DevTools MCP</div>
                <div className={styles.techDesc}>Browser Debugging</div>
              </div>
              <div className={styles.techCard}>
                <div className={styles.techIcon}>🌐</div>
                <div className={styles.techName}>Cloudflare Pages</div>
                <div className={styles.techDesc}>Hosting</div>
              </div>
            </div>
          </section>

          {/* Team */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>👥</span> Team
            </h2>
            <div className={styles.teamGrid}>
              <a
                href="https://www.linkedin.com/in/sureshdsk/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamCard}
              >
                <div className={styles.teamIcon}>👨‍💻</div>
                <div className={styles.teamName}>Suresh Kumar</div>
                <div className={styles.teamRole}>Developer</div>
              </a>
              <a
                href="https://www.linkedin.com/in/rhikshitha/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamCard}
              >
                <div className={styles.teamIcon}>👩‍💻</div>
                <div className={styles.teamName}>Rhikshitha Kamalakannan</div>
                <div className={styles.teamRole}>Developer</div>
              </a>
              <a
                href="https://linkedin.com/in/nishken92"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamCard}
              >
                <div className={styles.teamIcon}>👨‍💻</div>
                <div className={styles.teamName}>Nisanth Kennath</div>
                <div className={styles.teamRole}>Developer</div>
              </a>
              <a
                href="https://www.linkedin.com/in/athira-anish-a69530323/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamCard}
              >
                <div className={styles.teamIcon}>👩‍💻</div>
                <div className={styles.teamName}>Athira Anish</div>
                <div className={styles.teamRole}>Developer</div>
              </a>
              <a
                href="https://www.linkedin.com/in/dakshithaa-venkatesan-a0400a332"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamCard}
              >
                <div className={styles.teamIcon}>👩‍💻</div>
                <div className={styles.teamName}>Dakshithaa</div>
                <div className={styles.teamRole}>Developer</div>
              </a>
            </div>
          </section>

          {/* Credits */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>🎵</span> Credits
            </h2>
            <div className={styles.text}>
              <p>
                Music provided by{' '}
                <a
                  href="https://ncs.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  NCS (NoCopyrightSounds)
                </a>
                , a copyright-free music label offering high-quality tracks for creators.
              </p>
            </div>
          </section>

          {/* Open Source */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.emoji}>💻</span> Open Source
            </h2>
            <div className={styles.text}>
              <p>
                FinnLens is 100% open source. The entire codebase is available on GitHub —
                contributions, feedback, and stars are always welcome!
              </p>
              <div className={styles.buttonGroup}>
                <a
                  href="https://github.com/sureshdsk/finn-lens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.primaryButton}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
                <button onClick={() => navigate('/')} className={styles.secondaryButton}>
                  Try FinnLens →
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <p className={styles.footerText}>
              Made with ❤️ at{' '}
              <a
                href="https://build2learn.in"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                build2learn
              </a>
            </p>
          </footer>
        </div>
      </div>

      {/* Floating particles background */}
      <div className={styles.particles}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
