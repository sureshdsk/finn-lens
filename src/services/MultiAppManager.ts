// Manages multiple app data sources and combines them

import type { UpiAppId } from '../types/app.types';
import type { ParsedData, AppRawData } from '../types/data.types';
import { AppDetector } from './AppDetector';

/**
 * Manages multiple app data sources and combines them
 */
export class MultiAppManager {
  private detector: AppDetector;

  constructor() {
    this.detector = new AppDetector();
  }

  /**
   * Process a file and determine which app it belongs to
   */
  async processFile(
    file: File,
    password?: string
  ): Promise<{
    success: boolean;
    appId?: UpiAppId;
    rawData?: AppRawData;
    error?: string;
  }> {
    // Detect app
    const detection = await this.detector.detectApp(file);

    if (!detection) {
      return {
        success: false,
        error: 'Could not detect UPI app from file. Please ensure it is a valid export.',
      };
    }

    // Check if password is required but not provided
    if (detection.requiresPassword && !password) {
      return {
        success: false,
        error: 'This file requires a password.',
      };
    }

    try {
      // Extract raw data using detected adapter
      const rawDataMap = await detection.adapter.extract(file, password);

      const appRawData: AppRawData = {
        app: detection.adapter.appId,
        rawData: rawDataMap,
        uploadedAt: new Date(),
      };

      return {
        success: true,
        appId: detection.adapter.appId,
        rawData: appRawData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process file',
      };
    }
  }

  /**
   * Parse raw data from all apps into unified ParsedData
   * Merges data from multiple sources
   */
  async parseAllAppData(
    rawDataByApp: Map<UpiAppId, AppRawData>
  ): Promise<{ success: boolean; data?: ParsedData; error?: string }> {
    const combinedData: ParsedData = {
      transactions: [],
      groupExpenses: [],
      cashbackRewards: [],
      voucherRewards: [],
      activities: [],
      sources: [],
    };

    const errors: string[] = [];

    // Parse each app's data
    for (const [appId, appRawData] of rawDataByApp.entries()) {
      const adapter = this.detector.getAdapter(appId);
      if (!adapter) {
        errors.push(`No adapter found for ${appId}`);
        continue;
      }

      try {
        const parseResult = await adapter.parse(appRawData.rawData);

        if (!parseResult.success || !parseResult.data) {
          errors.push(parseResult.error || `Failed to parse ${appId}`);
          continue;
        }

        // Merge parsed data
        const parsed = parseResult.data;

        if (parsed.transactions) {
          combinedData.transactions.push(...parsed.transactions);
        }
        if (parsed.groupExpenses) {
          combinedData.groupExpenses.push(...parsed.groupExpenses);
        }
        if (parsed.cashbackRewards) {
          combinedData.cashbackRewards.push(...parsed.cashbackRewards);
        }
        if (parsed.voucherRewards) {
          combinedData.voucherRewards.push(...parsed.voucherRewards);
        }
        if (parsed.activities) {
          combinedData.activities.push(...parsed.activities);
        }

        // Track source
        if (!combinedData.sources.includes(appId)) {
          combinedData.sources.push(appId);
        }
      } catch (error) {
        errors.push(
          `Error parsing ${appId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Sort by time (newest first)
    combinedData.transactions.sort((a, b) => b.time.getTime() - a.time.getTime());
    combinedData.activities.sort((a, b) => b.time.getTime() - a.time.getTime());
    combinedData.groupExpenses.sort(
      (a, b) => b.creationTime.getTime() - a.creationTime.getTime()
    );

    if (errors.length > 0) {
      console.warn('Parsing errors:', errors);
    }

    return { success: true, data: combinedData };
  }
}
