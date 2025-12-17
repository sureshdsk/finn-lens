// Service to auto-detect which UPI app a file belongs to

import type { UpiAppId } from '../types/app.types';
import type { AppAdapter } from '../adapters/base/AppAdapter';
import { GooglePayAdapter } from '../adapters/googlepay/GooglePayAdapter';
import { BhimAdapter } from '../adapters/bhim/BhimAdapter';
// import { PhonePeAdapter } from '../adapters/phonepe/PhonePeAdapter'; // Future
// import { PaytmAdapter } from '../adapters/paytm/PaytmAdapter'; // Future

/**
 * Detection result with confidence scoring
 */
export interface DetectionMatch {
  adapter: AppAdapter;
  confidence: number;
  requiresPassword?: boolean;
}

/**
 * Service to auto-detect which UPI app a file belongs to
 */
export class AppDetector {
  private adapters: AppAdapter[] = [];

  constructor() {
    // Register all adapters
    this.adapters.push(new GooglePayAdapter());
    this.adapters.push(new BhimAdapter());
    // this.adapters.push(new PhonePeAdapter()); // Future
    // this.adapters.push(new PaytmAdapter()); // Future
  }

  /**
   * Detect which app a file belongs to
   * @param file - File to analyze
   * @returns Best matching adapter or null
   */
  async detectApp(file: File): Promise<DetectionMatch | null> {
    const results: DetectionMatch[] = [];

    // Peek at file content for better detection (first 10KB to handle HTML files with large CSS blocks)
    let contentPreview: string | undefined;
    try {
      const blob = file.slice(0, 10240);
      contentPreview = await blob.text();
    } catch (error) {
      // If reading fails, adapters will only use filename
    }

    // Run all adapters in parallel
    const detectionPromises = this.adapters.map(async adapter => {
      const result = await adapter.detect(file, contentPreview);
      if (result.canHandle) {
        results.push({
          adapter,
          confidence: result.confidence,
          requiresPassword: result.requiresPassword,
        });
      }
    });

    await Promise.all(detectionPromises);

    // Return adapter with highest confidence
    if (results.length === 0) return null;

    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }

  /**
   * Get adapter by app ID
   */
  getAdapter(appId: UpiAppId): AppAdapter | null {
    return this.adapters.find(a => a.appId === appId) || null;
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): AppAdapter[] {
    return [...this.adapters];
  }
}
