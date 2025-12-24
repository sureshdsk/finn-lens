import { describe, it, expect } from 'vitest';
import {
  filterTransactionsByYear,
  filterActivitiesByYear,
  filterGroupExpensesByYear,
  filterCashbackRewardsByYear,
  filterVouchersByYear,
} from './dateUtils';
import type { Transaction, ActivityRecord, GroupExpense, CashbackReward, Voucher, Currency } from '../types/data.types';
import { UpiApp } from '../types/app.types';

// Helper function to create a test transaction
function createTransaction(
  id: string,
  time: Date,
  amount: Currency,
  status: string = 'Completed',
  description: string = 'Test Transaction'
): Transaction {
  return {
    time,
    id,
    description,
    product: 'Google Pay',
    method: 'UPI',
    status,
    amount,
    sourceApp: UpiApp.GOOGLE_PAY,
  };
}

// Helper function to create a test activity
function createActivity(
  title: string,
  time: Date,
  amount: Currency,
  transactionType: 'sent' | 'received' | 'paid' | 'request' | 'other' = 'sent',
  description?: string
): ActivityRecord {
  return {
    title,
    time,
    transactionType,
    amount,
    description,
    sourceApp: UpiApp.GOOGLE_PAY,
  };
}

// Helper function to create a currency object
function createCurrency(value: number, currency: 'INR' | 'USD' = 'INR'): Currency {
  return { value, currency };
}

describe('dateUtils - Failed Transaction Filtering', () => {
  describe('filterTransactionsByYear', () => {
    it('should exclude transactions with "Failed" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Failed'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
      expect(result.every(t => t.status !== 'Failed')).toBe(true);
    });

    it('should exclude transactions with "Declined" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Declined'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Cancelled" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Cancelled'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Canceled" status (US spelling)', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Canceled'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Rejected" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Rejected'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Error" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Error'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Refund" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Refund'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should exclude transactions with "Reversed" status', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Reversed'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '3']);
    });

    it('should be case-insensitive when checking for failed statuses', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'FAILED'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'failed'),
        createTransaction('4', new Date('2025-01-04'), createCurrency(400), 'Failed'),
        createTransaction('5', new Date('2025-01-05'), createCurrency(500), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '5']);
    });

    it('should handle status containing failed keywords', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Payment Failed'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Transaction Declined'),
        createTransaction('4', new Date('2025-01-04'), createCurrency(400), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '4']);
    });

    it('should keep transactions with successful statuses', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Complete'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Success'),
        createTransaction('4', new Date('2025-01-04'), createCurrency(400), 'Pending'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(4);
      expect(result.map(t => t.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should handle empty status field', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), ''),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      // Empty status should be treated as successful (not failed)
      expect(result).toHaveLength(3);
      expect(result.map(t => t.id)).toEqual(['1', '2', '3']);
    });

    it('should filter by year AND exclude failed transactions', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2024-06-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2024-06-02'), createCurrency(200), 'Failed'),
        createTransaction('3', new Date('2025-06-01'), createCurrency(300), 'Completed'),
        createTransaction('4', new Date('2025-06-02'), createCurrency(400), 'Failed'),
        createTransaction('5', new Date('2025-06-03'), createCurrency(500), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, '2025');

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['3', '5']);
      // Should only have 2025 transactions that are not failed
      expect(result.every(t => t.time.getFullYear() === 2025)).toBe(true);
      expect(result.every(t => !t.status.toLowerCase().includes('failed'))).toBe(true);
    });

    it('should return all successful transactions when year is "all"', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2023-01-01'), createCurrency(100), 'Completed'),
        createTransaction('2', new Date('2023-06-01'), createCurrency(200), 'Failed'),
        createTransaction('3', new Date('2024-01-01'), createCurrency(300), 'Completed'),
        createTransaction('4', new Date('2024-06-01'), createCurrency(400), 'Failed'),
        createTransaction('5', new Date('2025-01-01'), createCurrency(500), 'Completed'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(3);
      expect(result.map(t => t.id)).toEqual(['1', '3', '5']);
    });

    it('should handle empty transactions array', () => {
      const transactions: Transaction[] = [];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(0);
    });

    it('should handle all failed transactions', () => {
      const transactions: Transaction[] = [
        createTransaction('1', new Date('2025-01-01'), createCurrency(100), 'Failed'),
        createTransaction('2', new Date('2025-01-02'), createCurrency(200), 'Declined'),
        createTransaction('3', new Date('2025-01-03'), createCurrency(300), 'Cancelled'),
      ];

      const result = filterTransactionsByYear(transactions, 'all');

      expect(result).toHaveLength(0);
    });
  });

  describe('filterActivitiesByYear', () => {
    it('should exclude activities with "Failed" in title', () => {
      const activities: ActivityRecord[] = [
        createActivity('Sent money to John', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Failed transaction', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Received from Jane', new Date('2025-01-03'), createCurrency(300), 'received'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(a => a.title)).toEqual(['Sent money to John', 'Received from Jane']);
    });

    it('should exclude activities with "Failed" in description', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment to merchant', new Date('2025-01-01'), createCurrency(100), 'sent', 'Completed successfully'),
        createActivity('Payment to merchant', new Date('2025-01-02'), createCurrency(200), 'sent', 'Transaction failed'),
        createActivity('Received payment', new Date('2025-01-03'), createCurrency(300), 'received', 'Completed'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.filter(a => a.description?.includes('failed'))).toHaveLength(0);
    });

    it('should exclude activities with "Declined" keyword', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment sent', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Payment declined by bank', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Payment received', new Date('2025-01-03'), createCurrency(300), 'received'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.some(a => a.title.toLowerCase().includes('declined'))).toBe(false);
    });

    it('should exclude activities with "Cancelled" keyword', () => {
      const activities: ActivityRecord[] = [
        createActivity('Sent to merchant', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Transaction cancelled', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Received payment', new Date('2025-01-03'), createCurrency(300), 'received'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.some(a => a.title.toLowerCase().includes('cancelled'))).toBe(false);
    });

    it('should exclude activities with "Rejected" keyword', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment sent', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Payment rejected', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Money received', new Date('2025-01-03'), createCurrency(300), 'received'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.some(a => a.title.toLowerCase().includes('rejected'))).toBe(false);
    });

    it('should exclude activities with "Unsuccessful" keyword', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment completed', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Unsuccessful payment attempt', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Payment received', new Date('2025-01-03'), createCurrency(300), 'received'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.some(a => a.title.toLowerCase().includes('unsuccessful'))).toBe(false);
    });

    it('should be case-insensitive when checking for failed keywords', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment sent', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('FAILED transaction', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Transaction Failed', new Date('2025-01-03'), createCurrency(300), 'sent'),
        createActivity('failed payment', new Date('2025-01-04'), createCurrency(400), 'sent'),
        createActivity('Successful payment', new Date('2025-01-05'), createCurrency(500), 'sent'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(2);
      expect(result.map(a => a.title)).toEqual(['Payment sent', 'Successful payment']);
    });

    it('should filter by year AND exclude failed activities', () => {
      const activities: ActivityRecord[] = [
        createActivity('2024 payment', new Date('2024-06-01'), createCurrency(100), 'sent'),
        createActivity('2024 failed', new Date('2024-06-02'), createCurrency(200), 'sent'),
        createActivity('2025 payment', new Date('2025-06-01'), createCurrency(300), 'sent'),
        createActivity('2025 failed', new Date('2025-06-02'), createCurrency(400), 'sent'),
        createActivity('2025 success', new Date('2025-06-03'), createCurrency(500), 'sent'),
      ];

      const result = filterActivitiesByYear(activities, '2025');

      expect(result).toHaveLength(2);
      expect(result.map(a => a.title)).toEqual(['2025 payment', '2025 success']);
      expect(result.every(a => a.time.getFullYear() === 2025)).toBe(true);
    });

    it('should keep activities without failed keywords', () => {
      const activities: ActivityRecord[] = [
        createActivity('Sent money', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Received payment', new Date('2025-01-02'), createCurrency(200), 'received'),
        createActivity('Paid for service', new Date('2025-01-03'), createCurrency(300), 'paid'),
        createActivity('Payment request', new Date('2025-01-04'), createCurrency(400), 'request'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(4);
    });

    it('should handle empty activities array', () => {
      const activities: ActivityRecord[] = [];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(0);
    });

    it('should handle all failed activities', () => {
      const activities: ActivityRecord[] = [
        createActivity('Failed payment', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Declined transaction', new Date('2025-01-02'), createCurrency(200), 'sent'),
        createActivity('Cancelled payment', new Date('2025-01-03'), createCurrency(300), 'sent'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(0);
    });

    it('should handle activities without description field', () => {
      const activities: ActivityRecord[] = [
        createActivity('Payment sent', new Date('2025-01-01'), createCurrency(100), 'sent'),
        createActivity('Failed payment', new Date('2025-01-02'), createCurrency(200), 'sent'),
      ];

      const result = filterActivitiesByYear(activities, 'all');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Payment sent');
    });
  });

  describe('Other filter functions', () => {
    it('filterGroupExpensesByYear should filter by year only (no status filtering)', () => {
      const expenses: GroupExpense[] = [
        {
          creationTime: new Date('2024-01-01'),
          creator: 'User1',
          groupName: 'Trip',
          totalAmount: createCurrency(1000),
          state: 'COMPLETED',
          title: 'Hotel',
          items: [],
          sourceApp: UpiApp.GOOGLE_PAY,
        },
        {
          creationTime: new Date('2025-01-01'),
          creator: 'User1',
          groupName: 'Dinner',
          totalAmount: createCurrency(500),
          state: 'ONGOING',
          title: 'Restaurant',
          items: [],
          sourceApp: UpiApp.GOOGLE_PAY,
        },
      ];

      const result = filterGroupExpensesByYear(expenses, '2025');

      expect(result).toHaveLength(1);
      expect(result[0].groupName).toBe('Dinner');
    });

    it('filterCashbackRewardsByYear should filter by year only', () => {
      const rewards: CashbackReward[] = [
        {
          date: new Date('2024-01-01'),
          currency: 'INR',
          amount: 100,
          description: 'Cashback from Store1',
          sourceApp: UpiApp.GOOGLE_PAY,
        },
        {
          date: new Date('2025-01-01'),
          currency: 'INR',
          amount: 200,
          description: 'Cashback from Store2',
          sourceApp: UpiApp.GOOGLE_PAY,
        },
      ];

      const result = filterCashbackRewardsByYear(rewards, '2025');

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Cashback from Store2');
    });

    it('filterVouchersByYear should filter by year based on expiry date', () => {
      const vouchers: Voucher[] = [
        {
          code: 'VOUCHER1',
          details: '₹100 off',
          summary: 'Shopping voucher',
          expiryDate: new Date('2024-12-31'),
          sourceApp: UpiApp.GOOGLE_PAY,
        },
        {
          code: 'VOUCHER2',
          details: '₹200 off',
          summary: 'Food voucher',
          expiryDate: new Date('2025-12-31'),
          sourceApp: UpiApp.GOOGLE_PAY,
        },
      ];

      const result = filterVouchersByYear(vouchers, '2025');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('VOUCHER2');
    });
  });
});
