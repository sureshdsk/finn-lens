import { useState, useRef, useEffect } from 'react';
import styles from './MultiSelect.module.css';

interface MultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  optionCounts?: Record<string, number>;
}

export default function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  optionCounts,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    onChange(options);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === options.length) {
      return `All (${options.length})`;
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className={styles.multiSelect} ref={dropdownRef}>
      <label className={styles.label}>{label}</label>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.triggerText}>{getDisplayText()}</span>
        <span className={styles.triggerIcon}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {/* Header with actions */}
          <div className={styles.dropdownHeader}>
            <button
              type="button"
              className={styles.headerButton}
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className={styles.headerButton}
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>

          {/* Options list */}
          <div className={styles.optionsList}>
            {options.length === 0 ? (
              <div className={styles.emptyState}>No options available</div>
            ) : (
              options.map(option => {
                const isSelected = selectedValues.includes(option);
                const count = optionCounts?.[option];
                return (
                  <label
                    key={option}
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(option)}
                      className={styles.checkbox}
                    />
                    <span className={styles.optionLabel}>
                      <span>{option}</span>
                      {count !== undefined && (
                        <span className={styles.optionCount}>({count})</span>
                      )}
                    </span>
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          <div className={styles.dropdownFooter}>
            {selectedValues.length} of {options.length} selected
          </div>
        </div>
      )}
    </div>
  );
}
