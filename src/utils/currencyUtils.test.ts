import { describe, it, expect } from 'vitest';
import { parseCurrency } from './currencyUtils';

describe('currencyUtils', () => {
  describe('parseCurrency', () => {
    describe('INR currency parsing', () => {
      it('should parse INR currency with rupee symbol', () => {
        const result = parseCurrency('₹1,234.56');
        expect(result).toEqual({ value: 1234.56, currency: 'INR' });
      });

      it('should parse INR currency with "INR" prefix', () => {
        const result = parseCurrency('INR 1234.56');
        expect(result).toEqual({ value: 1234.56, currency: 'INR' });
      });

      it('should parse INR with "INR" prefix and commas', () => {
        const result = parseCurrency('INR 1,23,456.78');
        expect(result).toEqual({ value: 123456.78, currency: 'INR' });
      });

      it('should handle INR with no decimal part', () => {
        const result = parseCurrency('₹1,234');
        expect(result).toEqual({ value: 1234, currency: 'INR' });
      });

      it('should handle INR with spaces', () => {
        const result = parseCurrency('₹ 1,234.56');
        expect(result).toEqual({ value: 1234.56, currency: 'INR' });
      });

      it('should handle INR with leading/trailing whitespace', () => {
        const result = parseCurrency('  ₹1,234.56  ');
        expect(result).toEqual({ value: 1234.56, currency: 'INR' });
      });

      it('should handle small INR amounts', () => {
        const result = parseCurrency('₹0.50');
        expect(result).toEqual({ value: 0.5, currency: 'INR' });
      });

      it('should handle large INR amounts', () => {
        const result = parseCurrency('₹10,00,000.00');
        expect(result).toEqual({ value: 1000000, currency: 'INR' });
      });
    });

    describe('USD currency parsing', () => {
      it('should parse USD currency with dollar symbol', () => {
        const result = parseCurrency('$123.45');
        expect(result).toEqual({ value: 123.45, currency: 'USD' });
      });

      it('should parse USD currency with "USD" prefix', () => {
        const result = parseCurrency('USD 123.45');
        expect(result).toEqual({ value: 123.45, currency: 'USD' });
      });

      it('should handle USD with commas', () => {
        const result = parseCurrency('$1,234,567.89');
        expect(result).toEqual({ value: 1234567.89, currency: 'USD' });
      });

      it('should handle USD with no decimal part', () => {
        const result = parseCurrency('$100');
        expect(result).toEqual({ value: 100, currency: 'USD' });
      });

      it('should handle USD with spaces', () => {
        const result = parseCurrency('$ 123.45');
        expect(result).toEqual({ value: 123.45, currency: 'USD' });
      });
    });

    describe('edge cases', () => {
      it('should handle zero values', () => {
        const result = parseCurrency('₹0.00');
        expect(result).toEqual({ value: 0, currency: 'INR' });
      });

      it('should handle values without commas', () => {
        const result = parseCurrency('₹123456.78');
        expect(result).toEqual({ value: 123456.78, currency: 'INR' });
      });

      it('should handle values with only rupee symbol', () => {
        const result = parseCurrency('₹100');
        expect(result).toEqual({ value: 100, currency: 'INR' });
      });

      it('should default to INR for ambiguous inputs', () => {
        const result = parseCurrency('100.50');
        expect(result.currency).toBe('INR');
      });

      it('should handle malformed currency strings gracefully', () => {
        const result = parseCurrency('invalid');
        expect(result.value).toBe(0);
        expect(result.currency).toBe('INR');
      });

      it('should handle empty strings', () => {
        const result = parseCurrency('');
        expect(result.value).toBe(0);
        expect(result.currency).toBe('INR');
      });

      it('should handle negative amounts', () => {
        const result = parseCurrency('₹-100.50');
        expect(result.value).toBe(-100.5);
        expect(result.currency).toBe('INR');
      });
    });

    describe('real-world examples', () => {
      it('should parse Google Pay transaction amounts', () => {
        const result = parseCurrency('INR 299.00');
        expect(result).toEqual({ value: 299, currency: 'INR' });
      });

      it('should parse My Activity HTML amounts', () => {
        const result = parseCurrency('₹35,000.00');
        expect(result).toEqual({ value: 35000, currency: 'INR' });
      });

      it('should parse amounts with Indian comma notation', () => {
        const result = parseCurrency('₹1,23,456.00');
        expect(result).toEqual({ value: 123456, currency: 'INR' });
      });

      it('should parse very large amounts', () => {
        const result = parseCurrency('₹3,30,000.00');
        expect(result).toEqual({ value: 330000, currency: 'INR' });
      });
    });
  });
});
