// Base adapter interface for UPI app data processing

import type { UpiAppId, FileFormat } from '../../types/app.types';
import type { ParsedData } from '../../types/data.types';

/**
 * Result from file detection
 */
export interface DetectionResult {
  canHandle: boolean;
  confidence: number; // 0-1
  requiresPassword?: boolean;
}

/**
 * Result from parsing
 */
export interface ParseResult {
  success: boolean;
  data?: Partial<ParsedData>; // Each adapter returns what it can parse
  error?: string;
}

/**
 * Abstract adapter interface for UPI apps
 * Each app implements this interface
 */
export interface AppAdapter {
  /**
   * App identifier
   */
  readonly appId: UpiAppId;

  /**
   * Supported file formats
   */
  readonly supportedFormats: FileFormat[];

  /**
   * Detect if this adapter can handle the given file
   * @param file - File to analyze
   * @param content - Optional file content (if already read)
   */
  detect(file: File, content?: string | ArrayBuffer): Promise<DetectionResult>;

  /**
   * Extract raw data from file
   * @param file - File to process
   * @param password - Optional password for encrypted files
   */
  extract(file: File, password?: string): Promise<Record<string, string>>;

  /**
   * Parse extracted raw data into unified format
   * @param rawData - Raw data from extract()
   */
  parse(rawData: Record<string, string>): Promise<ParseResult>;

  /**
   * Validate parsed data
   */
  validate(data: Partial<ParsedData>): boolean;
}

/**
 * Base class with common functionality
 */
export abstract class BaseAppAdapter implements AppAdapter {
  abstract readonly appId: UpiAppId;
  abstract readonly supportedFormats: FileFormat[];

  abstract detect(file: File, content?: string | ArrayBuffer): Promise<DetectionResult>;
  abstract extract(file: File, password?: string): Promise<Record<string, string>>;
  abstract parse(rawData: Record<string, string>): Promise<ParseResult>;

  /**
   * Default validation - can be overridden
   */
  validate(data: Partial<ParsedData>): boolean {
    // At least one data type should exist
    return Boolean(
      (data.transactions && data.transactions.length > 0) ||
      (data.activities && data.activities.length > 0) ||
      (data.groupExpenses && data.groupExpenses.length > 0)
    );
  }

  /**
   * Helper to read file as text
   */
  protected readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Helper to read file as ArrayBuffer
   */
  protected readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
