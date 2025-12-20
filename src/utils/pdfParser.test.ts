/**
 * Tests for PDF parser
 */

import { describe, it, expect } from 'vitest';
import { parsePhonePePDF, extractPDFText } from './pdfParser';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PDF_PATH = resolve(__dirname, '../../data/PhonePe_Transaction_Statement.pdf');
const CORRECT_PASSWORD = '9566123987';
const WRONG_PASSWORD = 'wrongpassword';

describe('extractPDFText', () => {
  it('should extract text from PDF with correct password', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await extractPDFText(pdfBuffer, CORRECT_PASSWORD);

    expect(result.success).toBe(true);
    expect(result.pages).toBeDefined();
    expect(result.pages!.length).toBeGreaterThan(0);
    expect(result.pages![0]).toContain('Transaction Statement');
  });

  it('should fail with wrong password', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await extractPDFText(pdfBuffer, WRONG_PASSWORD);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('password');
  });

  it('should fail with no password', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await extractPDFText(pdfBuffer);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('parsePhonePePDF', () => {
  it('should parse PhonePe PDF with correct password', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await parsePhonePePDF(pdfBuffer, CORRECT_PASSWORD);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBeGreaterThan(0);

    // Verify first transaction structure
    const firstTx = result.data![0];
    expect(firstTx).toHaveProperty('time');
    expect(firstTx).toHaveProperty('id');
    expect(firstTx).toHaveProperty('description');
    expect(firstTx).toHaveProperty('amount');
    expect(firstTx).toHaveProperty('status');
    expect(firstTx).toHaveProperty('category');
    expect(firstTx.sourceApp).toBe('phonepe');

    // Verify amount structure
    expect(firstTx.amount).toHaveProperty('value');
    expect(firstTx.amount).toHaveProperty('currency');
    expect(firstTx.amount.currency).toBe('INR');
    expect(typeof firstTx.amount.value).toBe('number');

    // Verify date is valid
    expect(firstTx.time instanceof Date).toBe(true);
    expect(firstTx.time.getTime()).toBeGreaterThan(0);

    console.log(`\n✓ Parsed ${result.data!.length} transactions from PhonePe PDF`);
    console.log(`First transaction:`, {
      date: firstTx.time.toISOString(),
      description: firstTx.description,
      amount: `${firstTx.amount.currency} ${firstTx.amount.value}`,
      type: firstTx.category,
    });
  });

  it('should fail with wrong password', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await parsePhonePePDF(pdfBuffer, WRONG_PASSWORD);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('password');
  });

  it('should parse all transactions with correct data', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await parsePhonePePDF(pdfBuffer, CORRECT_PASSWORD);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Verify all transactions have required fields
    result.data!.forEach((tx, idx) => {
      expect(tx.time instanceof Date, `Transaction ${idx}: time should be a Date`).toBe(true);
      expect(tx.id, `Transaction ${idx}: id should exist`).toBeTruthy();
      expect(tx.description, `Transaction ${idx}: description should exist`).toBeTruthy();
      expect(tx.amount.value, `Transaction ${idx}: amount should be a number`).toBeGreaterThan(0);
      expect(tx.amount.currency, `Transaction ${idx}: currency should be INR`).toBe('INR');
      expect(tx.sourceApp, `Transaction ${idx}: sourceApp should be phonepe`).toBe('phonepe');
    });

    // Log all transactions for manual verification
    console.log(`\n=== All Parsed Transactions ===`);
    result.data!.forEach((tx, idx) => {
      console.log(`${idx + 1}. ${tx.time.toLocaleDateString()} - ${tx.description} - INR ${tx.amount.value}`);
    });
  });

  it('should sort transactions by date (newest first)', async () => {
    const pdfBuffer = readFileSync(PDF_PATH).buffer as ArrayBuffer;
    const result = await parsePhonePePDF(pdfBuffer, CORRECT_PASSWORD);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Verify transactions are sorted newest to oldest
    for (let i = 0; i < result.data!.length - 1; i++) {
      const current = result.data![i].time.getTime();
      const next = result.data![i + 1].time.getTime();
      expect(current, `Transaction ${i} should be newer than transaction ${i + 1}`).toBeGreaterThanOrEqual(next);
    }
  });
});
