// Combined filter bar for year and app filtering - Modern compact design

import { useDataStore } from '../../stores/dataStore';
import { getUniqueApps } from '../../utils/filterUtils';
import { APP_METADATA } from '../../types/app.types';
import type { YearFilter, AppFilter } from '../../types/filter.types';
import type { UpiAppId } from '../../types/app.types';
import styles from './FilterBar.module.css';

export default function FilterBar() {
  const { parsedData, filterContext, setFilterContext } = useDataStore();

  if (!parsedData) return null;

  // Get unique apps from uploaded data
  const uploadedApps = getUniqueApps(parsedData);

  // Only show filter bar if there's data to filter
  if (uploadedApps.length === 0) return null;

  // Check if Google Pay is in the uploaded apps
  const hasGooglePay = uploadedApps.includes('googlepay');

  // Don't render anything if no Google Pay and single app (BHIM only)
  if (!hasGooglePay && uploadedApps.length === 1) {
    return null;
  }

  // Handle year change
  const handleYearChange = (year: YearFilter) => {
    setFilterContext({
      ...filterContext,
      year,
    });
  };

  // Handle app toggle
  const handleAppToggle = (appId: UpiAppId) => {
    let newApps: AppFilter[];

    if (filterContext.apps.includes('all')) {
      // If "all" is selected, switch to single app
      newApps = [appId];
    } else if (filterContext.apps.includes(appId)) {
      // Remove this app
      const filtered = filterContext.apps.filter(a => a !== appId);
      // If no apps left, select all
      newApps = filtered.length === 0 ? ['all'] : filtered as AppFilter[];
    } else {
      // Add this app
      const newSelection = [...filterContext.apps, appId];
      // If all apps are now selected, switch to "all"
      newApps = newSelection.length === uploadedApps.length ? ['all'] : newSelection as AppFilter[];
    }

    setFilterContext({
      ...filterContext,
      apps: newApps,
    });
  };

  // Handle "All Apps" toggle
  const handleAllAppsToggle = () => {
    setFilterContext({
      ...filterContext,
      apps: ['all'],
    });
  };

  // Check if app is selected
  const isAppSelected = (appId: UpiAppId): boolean => {
    return filterContext.apps.includes('all') || filterContext.apps.includes(appId);
  };

  // Available years
  const availableYears: YearFilter[] = ['all', '2025', '2024', '2023'];

  return (
    <div className={styles.filterBar}>
      {/* Year Filter - Only show for Google Pay */}
      {hasGooglePay && (
        <div className={styles.yearFilter}>
          {availableYears.map(year => (
            <button
              key={year}
              className={`${styles.yearChip} ${
                filterContext.year === year ? styles.activeYear : ''
              }`}
              onClick={() => handleYearChange(year)}
            >
              {year === 'all' ? 'All Time' : year}
            </button>
          ))}
        </div>
      )}

      {/* App Filter - Only show if multiple apps uploaded */}
      {uploadedApps.length > 1 && (
        <>
          {hasGooglePay && <div className={styles.divider} />}
          <div className={styles.appFilter}>
            <button
              className={`${styles.appChip} ${
                filterContext.apps.includes('all') ? styles.activeApp : ''
              }`}
              onClick={handleAllAppsToggle}
            >
              All Apps
            </button>
            {uploadedApps.map(appId => {
              const appMeta = APP_METADATA[appId];
              const selected = isAppSelected(appId);
              return (
                <button
                  key={appId}
                  className={`${styles.appChip} ${
                    selected ? styles.activeApp : ''
                  }`}
                  onClick={() => handleAppToggle(appId)}
                  style={{
                    backgroundColor: selected ? appMeta.color : undefined,
                    borderColor: selected ? appMeta.color : undefined,
                  }}
                  title={appMeta.displayName}
                >
                  <span className={styles.appIcon}>{appMeta.icon}</span>
                  <span className={styles.appName}>{appMeta.displayName}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
