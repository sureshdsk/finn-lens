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

      // Check for new XML format (var DATA = '<?xml...')
      const hasXmlFormat =
        htmlToCheck.includes('var DATA') &&
        htmlToCheck.includes('<UPITransactions') &&
        htmlToCheck.includes('BHIM - Bharat Interface For Money');

      if (hasXmlFormat) {
        return { canHandle: true, confidence: 0.95 };
      }

      // Check for old table format
      const hasTableFormat =
        htmlToCheck.includes('Bank Name') &&
        htmlToCheck.includes('Payment ID') &&
        htmlToCheck.includes('Pay/Collect') &&
        htmlToCheck.includes('DR/CR');

      if (hasTableFormat) {
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
   * Parse BHIM HTML into unified Transaction format
   * Supports both XML-embedded format and HTML table format
   */
  async parse(rawData: Record<string, string>): Promise<ParseResult> {
    try {
      const html = rawData.bhimHtml;
      if (!html) {
        return { success: false, error: 'No BHIM HTML data found' };
      }

      // Check if HTML table exists (preferred format as it has status info)
      // Try table format first because it contains complete status information
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      if (table) {
        // Use HTML table parser - it has status information
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
      }

      // Fall back to XML format if table not found
      if (html.includes('var DATA') && html.includes('<UPITransactions')) {
        const transactions = this.parseBhimXml(html);
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
      }

      return {
        success: false,
        error: 'Unrecognized BHIM file format',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse BHIM data',
      };
    }
  }

  /**
   * Clean merchant name - returns the full VPA as-is for better context
   * The masked VPA shows the payment provider and gives hints about the merchant
   * Examples:
   * - "gpay-xxxxxx52728@okbizaxis(xxxxxxxxTORE)" -> "gpay-xxxxxx52728@okbizaxis(xxxxxxxxTORE)"
   * - "paytm.xxtamnp@pty(xxxxxxxxUGAN)" -> "paytm.xxtamnp@pty(xxxxxxxxUGAN)"
   * - "ppfas.xommon.mf@validicici(PPFASMF)" -> "ppfas.xommon.mf@validicici(PPFASMF)"
   */
  private cleanMerchantName(name: string): string {
    // Return as-is to preserve full VPA context
    return name;
  }

  /**
   * Parse BHIM XML format (embedded in JavaScript variable)
   * XML structure: <UPITransactions><Transactions><Transaction .../></Transactions></UPITransactions>
   */
  private parseBhimXml(html: string): Transaction[] {
    const transactions: Transaction[] = [];

    try {
      // Extract XML from JavaScript variable
      const match = html.match(/var DATA\s*=\s*'(.*?)';/s);
      if (!match || !match[1]) {
        console.warn('Could not find DATA variable in BHIM HTML');
        return [];
      }

      const xmlString = match[1];

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        return [];
      }

      // Get all transaction elements
      const transactionElements = xmlDoc.querySelectorAll('Transaction');

      // Use a Set to track transaction IDs and avoid duplicates
      // BHIM exports sometimes contain duplicate transactions
      const seenIds = new Set<string>();

      for (const element of transactionElements) {
        try {
          // Extract attributes
          const accountNumber = element.getAttribute('AccountNumber') || '';
          const amountStr = element.getAttribute('Amount') || '0';
          const bank = element.getAttribute('Bank') || '';
          const benefitType = element.getAttribute('BenefitType') || ''; // CR (credit) or DR (debit)
          const id = element.getAttribute('Id') || '';
          const payeeVpa = element.getAttribute('PayeeVpa') || '';
          const payerVpa = element.getAttribute('PayerVpa') || '';
          const timeStr = element.getAttribute('Time') || '';
          const type = element.getAttribute('Type') || '';

          // Skip duplicate transactions
          if (seenIds.has(id)) {
            continue;
          }
          seenIds.add(id);

          // Parse time (ISO format: 2025-12-18T17:31:13.559Z)
          const transactionDate = new Date(timeStr);

          // Parse amount
          const amountValue = parseFloat(amountStr);
          const amount: Currency = { value: amountValue, currency: 'INR' };

          // Use full VPA for merchant display (keeps provider context)
          const payeeName = this.cleanMerchantName(payeeVpa);
          const payerName = this.cleanMerchantName(payerVpa);

          // Build description based on credit/debit
          const isCredit = benefitType === 'CR';
          const otherParty = isCredit ? payerName : payeeName;
          const description = `${type} - ${isCredit ? 'From' : 'To'} ${otherParty}`;

          // IMPORTANT: Only add DEBIT transactions to the transactions array
          // Transactions array is meant for expenses/spending only
          // Credits (money received) should not be included
          if (benefitType !== 'DR') {
            continue;
          }

          // Classify transaction
          const category = classifyTransaction(description, amountValue);

          // Create transaction
          const transaction: Transaction = {
            time: transactionDate,
            id: id,
            description: description,
            product: 'BHIM',
            method: `${bank} (${accountNumber})`,
            status: 'Completed', // XML format doesn't have explicit status
            amount: amount,
            category: category as TransactionCategory | undefined,
            sourceApp: this.appId,
          };

          transactions.push(transaction);
        } catch (error) {
          console.error('Error parsing BHIM XML transaction:', error);
          continue;
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error parsing BHIM XML:', error);
      return [];
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

    // Use a Set to track transaction IDs and avoid duplicates
    // BHIM exports sometimes contain duplicate transactions
    const seenIds = new Set<string>();

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

        // Skip duplicate transactions
        if (seenIds.has(paymentId)) {
          continue;
        }
        seenIds.add(paymentId);

        // Parse date (DD/MM/YYYY format)
        const [day, month, year] = dateStr.split('/').map(Number);
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const transactionDate = new Date(year, month - 1, day, hours, minutes, seconds);

        // Parse amount (plain number like "5541.80")
        const amountValue = parseFloat(amountStr.replace(/,/g, ''));
        const amount: Currency = { value: amountValue, currency: 'INR' };

        // Build description
        const otherParty = drCr === 'DR' ? receiver : sender;
        const cleanedParty = this.cleanMerchantName(otherParty);
        const description = `${payCollect} - ${drCr === 'DR' ? 'To' : 'From'} ${cleanedParty}`;

        // IMPORTANT: Only add SUCCESSFUL DEBIT transactions to the transactions array
        // Transactions array is meant for expenses/spending only
        // Skip:
        // 1. Credits (money received) - drCr !== 'DR'
        // 2. Failed transactions - status !== 'SUCCESS'
        if (drCr !== 'DR') {
          continue;
        }

        if (status !== 'SUCCESS') {
          continue;
        }

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
