import JSZip from 'jszip';
import { RawExtractedData } from '../types';

interface ZipParserResult {
  success: boolean;
  data?: RawExtractedData;
  error?: string;
}

export async function extractZipFile(file: File): Promise<ZipParserResult> {
  try {
    const zip = await JSZip.loadAsync(file);

    // Debug: List all files in the ZIP
    console.log('Files in ZIP:', Object.keys(zip.files));

    const extractedData: RawExtractedData = {};

    // Find and read Google transactions CSV (wildcard filename)
    // Support both with and without Takeout/ prefix
    const transactionFile = Object.keys(zip.files).find(name =>
      name.includes('Google transactions/transactions_') && name.endsWith('.csv')
    );

    console.log('Transaction file found:', transactionFile);

    if (transactionFile) {
      extractedData.transactions = await zip.files[transactionFile].async('text');
      console.log('Transactions extracted, length:', extractedData.transactions.length);
    }

    // Helper function to find file with flexible path matching
    const findFile = (relativePath: string): string | undefined => {
      return Object.keys(zip.files).find(name =>
        name.endsWith(relativePath) || name === relativePath
      );
    };

    // Read group expenses JSON
    const groupExpensesFile = findFile('Google Pay/Group expenses/Group expenses.json');
    console.log('Checking for group expenses, found:', groupExpensesFile);
    if (groupExpensesFile) {
      extractedData.groupExpenses = await zip.files[groupExpensesFile].async('text');
      console.log('Group expenses extracted, length:', extractedData.groupExpenses.length);
    }

    // Read cashback rewards CSV
    const cashbackFile = findFile('Google Pay/Rewards earned/Cashback rewards.csv');
    console.log('Checking for cashback, found:', cashbackFile);
    if (cashbackFile) {
      extractedData.cashbackRewards = await zip.files[cashbackFile].async('text');
      console.log('Cashback rewards extracted, length:', extractedData.cashbackRewards.length);
    }

    // Read voucher rewards JSON (remove )]}' prefix if present)
    const voucherFile = findFile('Google Pay/Rewards earned/Voucher rewards.json');
    console.log('Checking for vouchers, found:', voucherFile);
    if (voucherFile) {
      const raw = await zip.files[voucherFile].async('text');
      // Remove the anti-XSSI prefix )]}' if present
      extractedData.voucherRewards = raw.replace(/^\)\]\}'[\n\r]*/, '');
      console.log('Voucher rewards extracted, length:', extractedData.voucherRewards.length);
    }

    // Read money remittances CSV
    const remittancesFile = findFile('Google Pay/Money remittances and requests/Money remittances and requests.csv');
    console.log('Checking for remittances, found:', remittancesFile);
    if (remittancesFile) {
      extractedData.remittances = await zip.files[remittancesFile].async('text');
      console.log('Remittances extracted, length:', extractedData.remittances.length);
    }

    // Read My Activity HTML
    const myActivityFile = findFile('Google Pay/My Activity/My Activity.html');
    console.log('Checking for My Activity, found:', myActivityFile);
    if (myActivityFile) {
      extractedData.myActivity = await zip.files[myActivityFile].async('text');
      console.log('My Activity extracted, length:', extractedData.myActivity.length);
    }

    // Check if we got at least one file
    if (Object.keys(extractedData).length === 0) {
      return {
        success: false,
        error: 'No Google Pay data found in the ZIP file. Please ensure you uploaded a Google Takeout export with Google Pay data.'
      };
    }

    console.log('Final extracted data keys:', Object.keys(extractedData));
    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Zip extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract ZIP file'
    };
  }
}
