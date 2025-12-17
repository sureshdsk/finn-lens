import { useState } from 'react';
import styles from './PasswordModal.module.css';

interface PasswordModalProps {
  fileName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordModal({ fileName, onSubmit, onCancel }: PasswordModalProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Password Required</h3>
        <p className={styles.message}>
          The file <strong>{fileName}</strong> is password-protected. Please enter the password to
          continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className={styles.input}
            autoFocus
          />

          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={!password.trim()} className={styles.submitButton}>
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
