import { describe, it, expect } from 'vitest';
import {
  cleanMerchantDescription,
  normalizeMerchantName,
  groupTransactionsByMerchant,
} from './merchantUtils';

describe('merchantUtils', () => {
  describe('cleanMerchantDescription', () => {
    it('should remove common prefixes', () => {
      expect(cleanMerchantDescription('To Bank Account')).toBe('Bank Account');
      expect(cleanMerchantDescription('From Bank Account')).toBe('Bank Account');
      expect(cleanMerchantDescription('Payment to Swiggy')).toBe('Swiggy');
      expect(cleanMerchantDescription('Paid to Amazon')).toBe('Amazon');
      expect(cleanMerchantDescription('Sent to John Doe')).toBe('John Doe');
      expect(cleanMerchantDescription('Received from Jane')).toBe('Jane');
    });

    it('should remove trailing parentheses', () => {
      expect(cleanMerchantDescription('Swiggy (Order #12345)')).toBe('Swiggy');
      expect(cleanMerchantDescription('Amazon (Purchase)')).toBe('Amazon');
    });

    it('should remove trailing transaction IDs', () => {
      expect(cleanMerchantDescription('Swiggy - ABC123')).toBe('Swiggy');
      expect(cleanMerchantDescription('Amazon 12345678')).toBe('Amazon');
    });

    it('should handle multiple cleaning operations', () => {
      expect(cleanMerchantDescription('Payment to Swiggy - TXN123456')).toBe('Swiggy');
    });
  });

  describe('normalizeMerchantName', () => {
    it('should group bank transfers together', () => {
      const result1 = normalizeMerchantName('To Bank Account');
      const result2 = normalizeMerchantName('From Bank Account');
      const result3 = normalizeMerchantName('Bank Account Transfer');

      expect(result1.key).toBe('BANK_TRANSFER');
      expect(result2.key).toBe('BANK_TRANSFER');
      expect(result3.key).toBe('BANK_TRANSFER');
      expect(result1.displayName).toBe('Bank Account Transfers');
    });

    it('should group UPI transfers together', () => {
      const result1 = normalizeMerchantName('UPI Transaction');
      const result2 = normalizeMerchantName('Payment via UPI');

      expect(result1.key).toBe('UPI_TRANSFER');
      expect(result2.key).toBe('UPI_TRANSFER');
      expect(result1.displayName).toBe('UPI Transfers');
    });

    it('should group Swiggy variations', () => {
      const result1 = normalizeMerchantName('Swiggy');
      const result2 = normalizeMerchantName('SWIGGY');
      const result3 = normalizeMerchantName('Swiggy Delivery');

      expect(result1.key).toBe('SWIGGY');
      expect(result2.key).toBe('SWIGGY');
      expect(result3.key).toBe('SWIGGY');
      expect(result1.displayName).toBe('Swiggy');
    });

    it('should group Amazon variations', () => {
      const result1 = normalizeMerchantName('Amazon');
      const result2 = normalizeMerchantName('AMZN');
      const result3 = normalizeMerchantName('amazon.in');

      expect(result1.key).toBe('AMAZON');
      expect(result2.key).toBe('AMAZON');
      expect(result3.key).toBe('AMAZON');
      expect(result1.displayName).toBe('Amazon');
    });

    it('should handle unknown merchants with normalized lowercase key', () => {
      const result = normalizeMerchantName('My Local Store');

      expect(result.key).toBe('my local store');
      expect(result.displayName).toBe('My Local Store');
    });

    it('should group electricity bills', () => {
      const result1 = normalizeMerchantName('Electricity Bill');
      const result2 = normalizeMerchantName('BESCOM Payment');

      expect(result1.key).toBe('ELECTRICITY_BILL');
      expect(result2.key).toBe('ELECTRICITY_BILL');
      expect(result1.displayName).toBe('Electricity Bill');
    });

    it('should group mobile recharges', () => {
      const result1 = normalizeMerchantName('Mobile Recharge');
      const result2 = normalizeMerchantName('Airtel Recharge');
      const result3 = normalizeMerchantName('Jio Recharge');

      expect(result1.key).toBe('MOBILE_RECHARGE');
      expect(result2.key).toBe('MOBILE_RECHARGE');
      expect(result3.key).toBe('MOBILE_RECHARGE');
    });
  });

  describe('groupTransactionsByMerchant', () => {
    const mockConvertToINR = (amount: { value: number; currency: string }) => amount.value;

    it('should group and aggregate transactions by merchant', () => {
      const transactions = [
        { description: 'Swiggy Order', amount: { value: 500, currency: 'INR' } },
        { description: 'SWIGGY Delivery', amount: { value: 300, currency: 'INR' } },
        { description: 'Amazon Purchase', amount: { value: 1000, currency: 'INR' } },
        { description: 'AMZN', amount: { value: 500, currency: 'INR' } },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result).toHaveLength(2); // Swiggy and Amazon

      const swiggy = result.find(m => m.fullName === 'Swiggy');
      const amazon = result.find(m => m.fullName === 'Amazon');

      expect(swiggy).toBeDefined();
      expect(swiggy?.amount).toBe(800); // 500 + 300
      expect(swiggy?.count).toBe(2);

      expect(amazon).toBeDefined();
      expect(amazon?.amount).toBe(1500); // 1000 + 500
      expect(amazon?.count).toBe(2);
    });

    it('should group all bank transfers together', () => {
      const transactions = [
        { description: 'To Bank Account', amount: { value: 1000, currency: 'INR' } },
        { description: 'From Bank Account', amount: { value: 500, currency: 'INR' } },
        { description: 'Bank Account Transfer', amount: { value: 200, currency: 'INR' } },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Bank Account Transfers');
      expect(result[0].amount).toBe(1700); // 1000 + 500 + 200
      expect(result[0].count).toBe(3);
    });

    it('should sort merchants by amount (highest first)', () => {
      const transactions = [
        { description: 'Merchant A', amount: { value: 100, currency: 'INR' } },
        { description: 'Merchant B', amount: { value: 500, currency: 'INR' } },
        { description: 'Merchant C', amount: { value: 300, currency: 'INR' } },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result[0].fullName).toBe('Merchant B');
      expect(result[0].amount).toBe(500);
      expect(result[1].fullName).toBe('Merchant C');
      expect(result[1].amount).toBe(300);
      expect(result[2].fullName).toBe('Merchant A');
      expect(result[2].amount).toBe(100);
    });

    it('should truncate long merchant names', () => {
      const transactions = [
        {
          description: 'This is a very long merchant name that should be truncated',
          amount: { value: 100, currency: 'INR' },
        },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result[0].name).toBe('This is a very long merch...');
      expect(result[0].fullName).toBe('This is a very long merchant name that should be truncated');
    });

    it('should skip empty or too short descriptions', () => {
      const transactions = [
        { description: '', amount: { value: 100, currency: 'INR' } },
        { description: 'A', amount: { value: 100, currency: 'INR' } },
        { description: 'Valid Merchant', amount: { value: 100, currency: 'INR' } },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Valid Merchant');
    });

    it('should handle case-insensitive matching for unknown merchants', () => {
      const transactions = [
        { description: 'Local Store', amount: { value: 100, currency: 'INR' } },
        { description: 'local store', amount: { value: 50, currency: 'INR' } },
        { description: 'LOCAL STORE', amount: { value: 25, currency: 'INR' } },
      ];

      const result = groupTransactionsByMerchant(transactions, mockConvertToINR);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(175); // 100 + 50 + 25
      expect(result[0].count).toBe(3);
    });
  });
});
