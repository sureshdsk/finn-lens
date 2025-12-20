// Core data structure types for multi-app UPI exports

import type { TransactionCategory } from '../utils/categoryUtils';
import type { UpiAppId } from './app.types';

export interface Currency {
  value: number;
  currency: 'INR' | 'USD';
}

export interface Transaction {
  time: Date;
  id: string;
  description: string;
  product: string;
  method: string;
  status: string;
  amount: Currency;
  category?: TransactionCategory;
  sourceApp: UpiAppId; // Track which app this transaction came from
}

export interface GroupExpenseItem {
  amount: Currency;
  state: 'PAID_RECEIVED' | 'UNPAID';
  payer: string;
}

export interface GroupExpense {
  creationTime: Date;
  creator: string;
  groupName: string;
  totalAmount: Currency;
  state: 'ONGOING' | 'COMPLETED' | 'CLOSED';
  title: string;
  items: GroupExpenseItem[];
  sourceApp: UpiAppId; // Track which app this group expense came from
}

export interface CashbackReward {
  date: Date;
  currency: 'INR' | 'USD';
  amount: number;
  description: string;
  sourceApp: UpiAppId; // Track which app this cashback came from
}

export interface Voucher {
  code: string;
  details: string;
  summary: string;
  expiryDate: Date;
  sourceApp: UpiAppId; // Track which app this voucher came from
}

export interface ActivityRecord {
  title: string;
  time: Date;
  description?: string;
  products?: string[];

  // STRUCTURED FIELDS
  transactionType?: 'sent' | 'received' | 'paid' | 'request' | 'other';
  amount?: Currency;
  recipient?: string;
  sender?: string;
  category?: TransactionCategory;
  sourceApp: UpiAppId; // Track which app this activity came from
}

export interface ParsedData {
  transactions: Transaction[];
  groupExpenses: GroupExpense[];
  cashbackRewards: CashbackReward[];
  voucherRewards: Voucher[];
  activities: ActivityRecord[];
  sources: UpiAppId[]; // Track which apps contributed data
}

export interface RawExtractedData {
  transactions?: string;
  groupExpenses?: string;
  cashbackRewards?: string;
  voucherRewards?: string;
  remittances?: string;
  myActivity?: string;
}

/**
 * App-specific raw data container
 */
export interface AppRawData {
  app: UpiAppId;
  rawData: Record<string, string>; // Flexible key-value pairs for different file formats
  uploadedAt: Date;
}
