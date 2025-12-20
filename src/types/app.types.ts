// Core types for multi-app UPI support

/**
 * Supported UPI apps
 */
export enum UpiApp {
  GOOGLE_PAY = 'googlepay',
  BHIM = 'bhim',
  PHONEPE = 'phonepe',
  PAYTM = 'paytm',
}

export type UpiAppId = `${UpiApp}`;

/**
 * App metadata for UI display
 */
export interface AppMetadata {
  id: UpiAppId;
  name: string;
  displayName: string;
  icon: string; // emoji or icon name
  supportedFormats: FileFormat[];
  color: string; // for UI theming
}

/**
 * Supported file formats per app
 */
export enum FileFormat {
  ZIP = 'zip',
  HTML = 'html',
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
}

/**
 * File detection result
 */
export interface FileDetectionResult {
  app: UpiAppId;
  confidence: number; // 0-1, how confident we are
  fileFormat: FileFormat;
  requiresPassword?: boolean;
}

/**
 * Upload context for files that need additional input
 */
export interface UploadContext {
  file: File;
  password?: string;
  detectedApp?: UpiAppId;
}

/**
 * App metadata registry
 */
export const APP_METADATA: Record<UpiAppId, AppMetadata> = {
  [UpiApp.GOOGLE_PAY]: {
    id: UpiApp.GOOGLE_PAY,
    name: 'googlepay',
    displayName: 'Google Pay',
    icon: '🔵',
    supportedFormats: [FileFormat.ZIP],
    color: '#4285F4',
  },
  [UpiApp.BHIM]: {
    id: UpiApp.BHIM,
    name: 'bhim',
    displayName: 'BHIM',
    icon: '🟠',
    supportedFormats: [FileFormat.HTML],
    color: '#FF6B35',
  },
  [UpiApp.PHONEPE]: {
    id: UpiApp.PHONEPE,
    name: 'phonepe',
    displayName: 'PhonePe',
    icon: '🟣',
    supportedFormats: [FileFormat.PDF],
    color: '#5F259F',
  },
  [UpiApp.PAYTM]: {
    id: UpiApp.PAYTM,
    name: 'paytm',
    displayName: 'PayTM',
    icon: '🔷',
    supportedFormats: [FileFormat.ZIP, FileFormat.PDF, FileFormat.XLSX],
    color: '#00BAF2',
  },
};
