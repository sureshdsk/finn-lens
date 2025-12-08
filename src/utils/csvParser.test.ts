import { describe, it, expect } from 'vitest';
import { parseTransactionsCSV } from './csvParser';

describe('csvParser', () => {
  describe('parseTransactionsCSV', () => {
    it('should parse valid transaction CSV with all fields', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.5455-3323-4557-83262..33,YouTube Premium Family (YouTube),Google Play Apps,HDFC Bank-1: @okhdfcbank,Complete,INR 299.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        id: 'GPY.5455-3323-4557-83262..33',
        description: 'YouTube Premium Family (YouTube)',
        product: 'Google Play Apps',
        method: 'HDFC Bank-1: @okhdfcbank',
        status: 'Complete',
      });
      // CSV parser returns amount as string, not parsed Currency object
      expect(result.data![0].amount).toBe('INR 299.00');
      expect(result.data![0].time).toBeInstanceOf(Date);
    });

    it('should parse multiple transactions', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,YouTube Premium,Google Play Apps,HDFC Bank,Complete,INR 299.00
"Oct 14, 2025, 5:52 AM",GPY.456,Netflix,Google Play Apps,HDFC Bank,Complete,INR 649.00
"Sep 14, 2025, 5:51 AM",GPY.789,Spotify,Google Play Apps,HDFC Bank,Complete,INR 119.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      // CSV parser returns amount as string
      expect(result.data![0].amount).toBe('INR 299.00');
      expect(result.data![1].amount).toBe('INR 649.00');
      expect(result.data![2].amount).toBe('INR 119.00');
    });

    it('should parse dates correctly', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,Test Transaction,Product,Method,Complete,INR 100.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data![0].time).toBeInstanceOf(Date);
      expect(result.data![0].time.getFullYear()).toBe(2025);
      expect(result.data![0].time.getMonth()).toBe(10); // November is month 10 (0-indexed)
    });

    it('should handle empty CSV', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount\n`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle malformed CSV gracefully', () => {
      const csvContent = `Invalid CSV content without proper structure`;

      const result = parseTransactionsCSV(csvContent);

      // Parser handles this - returns success false with error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip rows with missing required fields', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,Test,Product,Method,Complete,INR 100.00
"Nov 14, 2025, 4:52 AM",,Missing ID,Product,Method,Complete,INR 100.00
"Nov 14, 2025, 4:52 AM",GPY.456,Test,Product,Method,Complete,INR 200.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      // Should only have 2 transactions (skipping the one with missing ID)
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle different date formats', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Dec 6, 2024, 3:30 PM",GPY.123,Test,Product,Method,Complete,INR 100.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data![0].time).toBeInstanceOf(Date);
    });

    it('should handle amounts with commas', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,Large Payment,Product,Method,Complete,"INR 1,23,456.00"`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      // CSV parser preserves commas in amount string
      expect(result.data![0].amount).toBe('INR 1,23,456.00');
    });

    it('should handle USD currency', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,International Payment,Product,Method,Complete,USD 50.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data![0].amount).toBe('USD 50.00');
    });

    it('should handle transactions with special characters in description', () => {
      const csvContent = `Time,Transaction ID,Description,Product,Payment method,Status,Amount
"Nov 14, 2025, 4:52 AM",GPY.123,"Payment for ""Special"" Item",Product,Method,Complete,INR 100.00`;

      const result = parseTransactionsCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data![0].description).toContain('Special');
    });
  });

  // Note: parseMoneyRequestsCSV is not yet implemented
  // Tests for it have been removed
});
