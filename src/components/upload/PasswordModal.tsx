import { useState } from 'react';

interface PasswordModalProps {
  fileName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export default function PasswordModal({ fileName, onSubmit, onCancel, error }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() && !isSubmitting) {
      setIsSubmitting(true);
      await onSubmit(password);
      setIsSubmitting(false);
      // Don't clear password - let parent decide if modal should close
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center mb-2 text-primary-900">
          Password Required
        </h3>

        {/* Message */}
        <p className="text-center text-sm text-primary-600 mb-6">
          The file <strong className="text-primary-900">{fileName}</strong> is password-protected.
          Please enter the password to continue.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl text-base
                     focus:outline-none focus:border-primary-500 transition-colors mb-4
                     disabled:bg-gray-50 disabled:cursor-not-allowed"
            autoFocus
            disabled={isSubmitting}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-primary-100 text-primary-900 rounded-xl
                       font-semibold text-sm transition-all duration-200
                       hover:bg-primary-200 active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isSubmitting}
              className="flex-1 px-6 py-3 bg-primary-900 text-white rounded-xl
                       font-semibold text-sm transition-all duration-200
                       hover:bg-primary-800 active:scale-95
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        </form>

        {/* Privacy note */}
        <p className="text-xs text-center text-primary-400 mt-4">
          🔒 Password is used only for decryption and never stored
        </p>
      </div>
    </div>
  );
}
