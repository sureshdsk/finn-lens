// Core data structure types for Google Pay export data

import type { TransactionCategory } from '../utils/categoryUtils';

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
}

export interface CashbackReward {
  date: Date;
  currency: 'INR' | 'USD';
  amount: number;
  description: string;
}

export interface Voucher {
  code: string;
  details: string;
  summary: string;
  expiryDate: Date;
}

export interface ActivityRecord {
  title: string;
  time: Date;
  description?: string;
  products?: string[];

  // NEW STRUCTURED FIELDS
  transactionType?: 'sent' | 'received' | 'paid' | 'request' | 'other';
  amount?: Currency;
  recipient?: string;
  sender?: string;
  category?: TransactionCategory;
}

export interface ParsedData {
  transactions: Transaction[];
  groupExpenses: GroupExpense[];
  cashbackRewards: CashbackReward[];
  voucherRewards: Voucher[];
  activities: ActivityRecord[];
}

export interface RawExtractedData {
  transactions?: string;
  groupExpenses?: string;
  cashbackRewards?: string;
  voucherRewards?: string;
  remittances?: string;
  myActivity?: string;
}
