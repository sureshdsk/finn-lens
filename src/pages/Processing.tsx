import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { MultiAppManager } from '../services/MultiAppManager';
import PasswordModal from '../components/upload/PasswordModal';
import styles from './Processing.module.css';

type ProcessingStage = 'detecting' | 'extracting' | 'parsing' | 'calculating' | 'complete' | 'error';

export default function Processing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState<ProcessingStage>('detecting');
  const [error, setError] = useState<string | null>(null);
  const [pendingPasswordFile, setPendingPasswordFile] = useState<File | null>(null);

  const { addAppData } = useDataStore();

  const multiAppManager = new MultiAppManager();

  useEffect(() => {
    processFiles();
  }, []);

  const processFiles = async () => {
    try {
      // Get files from navigation state
      const files = location.state?.files as File[] | undefined;

      if (!files || files.length === 0) {
        setError('No files provided');
        setStage('error');
        return;
      }

      // Stage 1: Detect and extract each file
      setStage('detecting');
      await sleep(300);

      for (const file of files) {
        const result = await multiAppManager.processFile(file);

        if (!result.success) {
          // Check if password required
          if (result.error?.includes('password')) {
            setPendingPasswordFile(file);
            return; // Wait for password input
          }

          setError(result.error || 'Failed to process file');
          setStage('error');
          return;
        }

        // Stage 2: Extract (happens inside processFile)
        setStage('extracting');
        await sleep(200);

        if (result.appId && result.rawData) {
          // Add app data to store (this also triggers parsing)
          await addAppData(result.appId, result.rawData);
        }
      }

      // Stage 3: Parsing (auto-triggered by addAppData)
      setStage('parsing');
      await sleep(500);

      // Stage 4: Calculate insights (auto-triggered by store)
      setStage('calculating');
      await sleep(500);

      // Stage 5: Complete
      setStage('complete');
      await sleep(500);

      // Navigate to insights page
      navigate('/insights');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStage('error');
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!pendingPasswordFile) return;

    try {
      const result = await multiAppManager.processFile(pendingPasswordFile, password);

      if (!result.success) {
        setError(result.error || 'Failed to process file');
        setStage('error');
        setPendingPasswordFile(null);
        return;
      }

      if (result.appId && result.rawData) {
        await addAppData(result.appId, result.rawData);
      }

      setPendingPasswordFile(null);

      // Continue processing
      processFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to unlock file');
      setStage('error');
    }
  };

  const handleRetry = () => {
    navigate('/');
  };

  if (pendingPasswordFile) {
    return (
      <PasswordModal
        fileName={pendingPasswordFile.name}
        onSubmit={handlePasswordSubmit}
        onCancel={() => navigate('/')}
      />
    );
  }

  if (stage === 'error') {
    return (
      <div className={styles.processing}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Processing Failed</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.processing}>
      <div className={styles.container}>
        <h1 className={styles.title}>Processing Your Data</h1>
        <p className={styles.subtitle}>This will only take a moment...</p>

        <div className={styles.stagesContainer}>
          <ProcessingStage
            icon="🔍"
            label="Detecting apps"
            active={stage === 'detecting'}
            complete={['extracting', 'parsing', 'calculating', 'complete'].includes(stage)}
          />
          <ProcessingStage
            icon="📦"
            label="Extracting files"
            active={stage === 'extracting'}
            complete={['parsing', 'calculating', 'complete'].includes(stage)}
          />
          <ProcessingStage
            icon="📊"
            label="Parsing data"
            active={stage === 'parsing'}
            complete={['calculating', 'complete'].includes(stage)}
          />
          <ProcessingStage
            icon="🔮"
            label="Calculating insights"
            active={stage === 'calculating'}
            complete={stage === 'complete'}
          />
        </div>

        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>

        <p className={styles.privacyNote}>
          🔒 All processing happens in your browser. Your data never leaves your device.
        </p>
      </div>
    </div>
  );
}

interface ProcessingStageProps {
  icon: string;
  label: string;
  active: boolean;
  complete: boolean;
}

function ProcessingStage({ icon, label, active, complete }: ProcessingStageProps) {
  const stageClasses = [
    styles.stage,
    active && styles.stageActive,
    complete && styles.stageComplete,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stageClasses}>
      <div className={styles.stageIcon}>{complete ? '✓' : icon}</div>
      <div className={styles.stageLabel}>{label}</div>
    </div>
  );
}

// Helper function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
