/**
 * Debug script to analyze PhonePe PDF parsing
 * Run with: npx tsx src/utils/debugPhonePePDF.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parsePhonePePDF } from './pdfParser';

async function debugPDF() {
  const pdfPath = path.join(process.cwd(), 'data/PhonePe_Transaction_Statement.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found at:', pdfPath);
    return;
  }

  console.log('Reading PDF from:', pdfPath);
  const buffer = fs.readFileSync(pdfPath);

  // You'll need to provide the password here
  const password = process.argv[2] || '';

  if (!password) {
    console.error('Please provide password as argument: npx tsx src/utils/debugPhonePePDF.ts <password>');
    return;
  }

  console.log('Parsing PDF...\n');
  const result = await parsePhonePePDF(buffer.buffer as ArrayBuffer, password, 'phonepe');

  if (!result.success) {
    console.error('Parse failed:', result.error);
    return;
  }

  console.log('✓ Successfully parsed!');
  console.log(`Found ${result.data?.length || 0} transactions\n`);

  if (result.warning) {
    console.warn('Warning:', result.warning);
  }

  // Display transactions
  result.data?.forEach((txn, idx) => {
    console.log(`Transaction ${idx + 1}:`);
    console.log(`  Date: ${txn.time.toLocaleString()}`);
    console.log(`  Description: ${txn.description}`);
    console.log(`  Amount: ${txn.amount.currency} ${txn.amount.value}`);
    console.log(`  ID: ${txn.id}`);
    console.log(`  Method: ${txn.method}`);
    console.log(`  Category: ${txn.category || 'N/A'}`);
    console.log('');
  });
}

debugPDF().catch(console.error);
