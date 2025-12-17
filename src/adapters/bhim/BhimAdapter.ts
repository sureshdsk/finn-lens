// BHIM adapter - handles BHIM HTML transaction history export

import JSZip from 'jszip';
import { BaseAppAdapter, DetectionResult, ParseResult } from '../base/AppAdapter';
import { UpiApp, FileFormat } from '../../types/app.types';
import { Transaction, Currency } from '../../types/data.types';
import { TransactionCategory } from '../../utils/categoryUtils';
import { classifyTransaction } from '../../utils/multi-layer-classifier';

/**
 * BHIM adapter - handles BHIM HTML export (supports both ZIP and HTML formats)
 */
export class BhimAdapter extends BaseAppAdapter {
  readonly appId = UpiApp.BHIM;
  readonly supportedFormats = [FileFormat.HTML, FileFormat.ZIP];

  /**
   * Detect if file is BHIM HTML export (supports both ZIP and HTML)
   */
  async detect(file: File, content?: string): Promise<DetectionResult> {
    try {
      let htmlToCheck: string;

      // Handle ZIP files
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Look for HTML file inside ZIP
        const htmlFile = Object.keys(zip.files).find(name =>
          name.endsWith('.html') || name.endsWith('.htm')
        );

        if (!htmlFile) {
          return { canHandle: false, confidence: 0 };
        }

        // Extract HTML content for checking
        htmlToCheck = await zip.files[htmlFile].async('text');
      }
      // Handle HTML files
      else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        htmlToCheck = content || (await this.readFileAsText(file));
      }
      else {
        return { canHandle: false, confidence: 0 };
      }

      // Look for BHIM-specific markers in HTML
      const hasBhimMarkers =
        htmlToCheck.includes('Bank Name') &&
        htmlToCheck.includes('Payment ID') &&
        htmlToCheck.includes('Pay/Collect') &&
        htmlToCheck.includes('DR/CR');

      if (hasBhimMarkers) {
        return { canHandle: true, confidence: 0.9 };
      }

      return { canHandle: false, confidence: 0 };
    } catch (error) {
      return { canHandle: false, confidence: 0 };
    }
  }

  /**
   * Extract raw data from BHIM file (HTML or ZIP)
   */
  async extract(file: File): Promise<Record<string, string>> {
    let html: string;

    // Handle ZIP files
    if (file.name.endsWith('.zip')) {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Find HTML file inside ZIP
      const htmlFile = Object.keys(zip.files).find(name =>
        name.endsWith('.html') || name.endsWith('.htm')
      );

      if (!htmlFile) {
        throw new Error('No HTML file found in BHIM ZIP');
      }

      html = await zip.files[htmlFile].async('text');
    }
    // Handle HTML files directly
    else {
      html = await this.readFileAsText(file);
    }

    return { bhimHtml: html };
  }

  /**
   * Parse BHIM HTML table into unified Transaction format
   */
  async parse(rawData: Record<string, string>): Promise<ParseResult> {
    try {
      const html = rawData.bhimHtml;
      if (!html) {
        return { success: false, error: 'No BHIM HTML data found' };
      }

      const transactions = this.parseBhimHtmlTable(html);

      return {
        success: true,
        data: {
          transactions,
          groupExpenses: [],
          cashbackRewards: [],
          voucherRewards: [],
          activities: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse BHIM data',
      };
    }
  }

  /**
   * Parse BHIM HTML table
   * Table columns: Date | Time | Bank Name | Account Number | Sender | Receiver | Payment ID | Pay/Collect | Amount | DR/CR | Status
   */
  private parseBhimHtmlTable(html: string): Transaction[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const transactions: Transaction[] = [];

    // Find the table (assuming single table or main table)
    const table = doc.querySelector('table');
    if (!table) {
      console.warn('No table found in BHIM HTML');
      return [];
    }

    const rows = table.querySelectorAll('tr');

    // Skip header row (first row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');

      if (cells.length < 11) continue; // Expect 11 columns

      try {
        // Extract cell values
        const dateStr = cells[0].textContent?.trim() || '';
        const timeStr = cells[1].textContent?.trim() || '';
        const bankName = cells[2].textContent?.trim() || '';
        const accountNumber = cells[3].textContent?.trim() || '';
        const sender = cells[4].textContent?.trim() || '';
        const receiver = cells[5].textContent?.trim() || '';
        const paymentId = cells[6].textContent?.trim() || '';
        const payCollect = cells[7].textContent?.trim() || '';
        const amountStr = cells[8].textContent?.trim() || '0';
        const drCr = cells[9].textContent?.trim() || '';
        const status = cells[10].textContent?.trim() || '';

        // Parse date (DD/MM/YYYY format)
        const [day, month, year] = dateStr.split('/').map(Number);
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const transactionDate = new Date(year, month - 1, day, hours, minutes, seconds);

        // Parse amount (plain number like "5541.80")
        const amountValue = parseFloat(amountStr.replace(/,/g, ''));
        const amount: Currency = { value: amountValue, currency: 'INR' };

        // Build description
        const otherParty = drCr === 'DR' ? receiver : sender;
        const description = `${payCollect} - ${drCr === 'DR' ? 'To' : 'From'} ${otherParty}`;

        // Create transaction
        const category = classifyTransaction(description, amountValue);
        const transaction: Transaction = {
          time: transactionDate,
          id: paymentId,
          description: description,
          product: 'BHIM',
          method: `${bankName} (${accountNumber})`,
          status: status,
          amount: amount,
          category: category as TransactionCategory | undefined,
          sourceApp: this.appId,
        };

        transactions.push(transaction);
      } catch (error) {
        console.error(`Error parsing BHIM row ${i}:`, error);
        continue;
      }
    }

    return transactions;
  }
}
