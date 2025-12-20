/**
 * PhonePe adapter - handles PhonePe password-protected PDF transaction statements
 *
 * Supports: PhonePe_Transaction_Statement.pdf files
 */

import { BaseAppAdapter, DetectionResult, ParseResult } from '../base/AppAdapter';
import { UpiApp, FileFormat } from '../../types/app.types';
import { parsePhonePePDF } from '../../utils/pdfParser';

export class PhonePeAdapter extends BaseAppAdapter {
  readonly appId = UpiApp.PHONEPE;
  readonly supportedFormats = [FileFormat.PDF];

  /**
   * Detect if file is PhonePe PDF transaction statement
   */
  async detect(file: File, _content?: string | ArrayBuffer): Promise<DetectionResult> {
    try {
      // Check filename pattern
      const isPhonePeFile =
        (file.name.toLowerCase().includes('phonepe') ||
          file.name.toLowerCase().includes('phone_pe') ||
          file.name.toLowerCase().includes('phone-pe')) &&
        file.name.endsWith('.pdf');

      if (isPhonePeFile) {
        return {
          canHandle: true,
          confidence: 0.95,
          requiresPassword: true, // PhonePe PDFs are password-protected
        };
      }

      // Lower confidence for generic PDF files
      if (file.name.endsWith('.pdf')) {
        // Could be a PhonePe PDF without clear naming
        return {
          canHandle: true,
          confidence: 0.3,
          requiresPassword: true,
        };
      }

      return { canHandle: false, confidence: 0 };
    } catch (error) {
      return { canHandle: false, confidence: 0 };
    }
  }

  /**
   * Extract raw data from PhonePe PDF
   * Requires password for decryption
   * Validates password during extraction to fail fast
   */
  async extract(file: File, password?: string): Promise<Record<string, string>> {
    if (!password) {
      throw new Error('Password required for PhonePe PDF');
    }

    const arrayBuffer = await this.readFileAsArrayBuffer(file);

    // Clone ArrayBuffer to avoid detachment issues
    // PDF.js will detach the buffer when creating Uint8Array
    const clonedBuffer = arrayBuffer.slice(0);

    // Validate password by attempting to open the PDF (fail fast)
    // Don't parse transactions yet - just verify password works
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(clonedBuffer),
        password: password,
      });
      const pdf = await loadingTask.promise;
      // Password is valid if we can get the PDF object
      // Check we can access at least one page
      await pdf.getPage(1);
    } catch (error: any) {
      if (error.name === 'PasswordException') {
        throw new Error('Invalid PDF password. Please try again.');
      }
      if (error.name === 'InvalidPDFException') {
        throw new Error('Invalid or corrupted PDF file.');
      }
      throw new Error(error.message || 'Failed to decrypt PDF');
    }

    // Store as base64 string (similar to PaytmAdapter pattern)
    // Use original buffer since cloned buffer may be detached now
    const base64 = this.arrayBufferToBase64(arrayBuffer);

    return {
      phonepePdf: base64,
      password: password, // Store password for parse() step
    };
  }

  /**
   * Parse PhonePe PDF into unified Transaction format
   */
  async parse(rawData: Record<string, string>): Promise<ParseResult> {
    try {
      const base64Data = rawData.phonepePdf;
      const password = rawData.password;

      if (!base64Data) {
        return { success: false, error: 'No PhonePe PDF data found' };
      }

      if (!password) {
        return { success: false, error: 'Password required to decrypt PDF' };
      }

      // Convert base64 back to ArrayBuffer
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);

      // Parse using pdfParser
      const result = await parsePhonePePDF(arrayBuffer, password, this.appId);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to parse PhonePe PDF',
        };
      }

      // Return unified format
      return {
        success: true,
        data: {
          transactions: result.data,
          groupExpenses: [],
          cashbackRewards: [],
          voucherRewards: [],
          activities: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PhonePe data',
      };
    }
  }

  /**
   * Helper: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
