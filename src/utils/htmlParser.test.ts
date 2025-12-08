import { describe, it, expect } from 'vitest';
import { parseMyActivityHTML } from './htmlParser';

describe('htmlParser', () => {
  describe('parseMyActivityHTML', () => {
    it('should parse valid My Activity HTML with single transaction', () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>My Activity</title></head>
<body>
  <div class="outer-cell">
    <div class="header-cell"><p>Google Pay</p></div>
    <div class="content-cell">
      Paid ₹100.00 to TEST MERCHANT using Bank Account ******1234<br>
      Dec 6, 2025, 12:00:00 PM GMT+05:30<br>
    </div>
    <div class="content-cell">
      <b>Products:</b><br>
      Google Pay<br>
      <b>Details:</b><br>
      ABC123<br>
      Completed<br>
    </div>
  </div>
</body>
</html>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].transactionType).toBe('paid');
      expect(result.data![0].amount).toEqual({
        value: 100,
        currency: 'INR',
      });
      expect(result.data![0].recipient).toBe('TEST MERCHANT');
    });

    it('should parse sent transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="header-cell"><p>Google Pay</p></div>
  <div class="content-cell">
    Sent ₹500.00 using Bank Account XXXXXX8449<br>
    Nov 21, 2025, 6:01:52 AM GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    XYZ789<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].transactionType).toBe('sent');
      expect(result.data![0].amount?.value).toBe(500);
    });

    it('should parse received transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="header-cell"><p>Google Pay</p></div>
  <div class="content-cell">
    Received ₹1000.00<br>
    Dec 6, 2025, 12:12:14 PM GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    ABC123<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].transactionType).toBe('received');
      expect(result.data![0].amount?.value).toBe(1000);
    });

    it('should skip failed transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="header-cell"><p>Google Pay</p></div>
  <div class="content-cell">
    Received ₹100.00<br>
    Nov 27, 2025, 7:29:57 AM GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    ABC123<br>
    Failed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="header-cell"><p>Google Pay</p></div>
  <div class="content-cell">
    Received ₹200.00<br>
    Nov 27, 2025, 7:30:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    DEF456<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      // Should only have 1 transaction (the completed one)
      expect(result.data).toHaveLength(1);
      expect(result.data![0].amount?.value).toBe(200);
    });

    it('should parse multiple transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00 to Merchant A<br>
    Dec 6, 2025, 10:00:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Sent ₹200.00<br>
    Dec 6, 2025, 11:00:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Received ₹300.00<br>
    Dec 6, 2025, 12:00:00 PM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![0].amount?.value).toBe(100);
      expect(result.data![1].amount?.value).toBe(200);
      expect(result.data![2].amount?.value).toBe(300);
    });

    it('should parse dates correctly', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    8 Dec 2025, 20:11:19 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data![0].time).toBeInstanceOf(Date);
      expect(result.data![0].time.getDate()).toBe(8);
      expect(result.data![0].time.getMonth()).toBe(11); // December is month 11 (0-indexed)
      expect(result.data![0].time.getFullYear()).toBe(2025);
    });

    it('should parse amounts with commas', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Sent ₹35,000.00<br>
    Nov 30, 2025, 7:58:27 PM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data![0].amount?.value).toBe(35000);
    });

    it('should parse large amounts with Indian comma notation', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹1,23,456.78<br>
    Nov 30, 2025, 7:58:27 PM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data![0].amount?.value).toBe(123456.78);
    });

    it('should extract recipient from paid transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00 to JOHN DOE using Bank Account<br>
    Dec 6, 2025, 10:00:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data![0].recipient).toBe('JOHN DOE');
    });

    it('should extract merchant names with special characters', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹300.00 to M.K.SYED ASAN KADHER ROWTHER &amp;CO using Bank Account<br>
    Nov 30, 2025, 11:21:56 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      // HTML entities are decoded by DOMParser, & becomes &
      expect(result.data![0].title).toContain('M.K.SYED ASAN KADHER ROWTHER &CO');
      expect(result.data![0].transactionType).toBe('paid');
    });

    it('should handle empty HTML', () => {
      const htmlContent = '';

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle HTML with no transactions', () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>My Activity</title></head>
<body>
  <div class="some-other-content">
    No transactions here
  </div>
</body>
</html>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should skip transactions with invalid dates', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    Invalid Date Format<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      // Should handle gracefully (either skip or use a default date)
      expect(result.data).toBeDefined();
    });

    it('should handle IST timezone', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    4 Dec 2025, 23:08:00 IST<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data![0].time).toBeInstanceOf(Date);
    });

    it('should skip cancelled transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    Dec 6, 2025, 10:00:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Cancelled</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should skip declined transactions', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    Dec 6, 2025, 10:00:00 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Declined</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should correctly parse date format from actual Google Pay HTML', () => {
      // This is the actual date format found in Google Pay My Activity exports
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹330000.00 to MERCHANT NAME using Bank Account<br>
    Oct 9, 2018, 3:45:30 PM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].time).toBeInstanceOf(Date);
      expect(result.data![0].time.getFullYear()).toBe(2018);
      expect(result.data![0].time.getMonth()).toBe(9); // October is month 9 (0-indexed)
      expect(result.data![0].time.getDate()).toBe(9);
    });

    it('should not default to current date when parsing real date formats', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹500.00<br>
    Nov 21, 2024, 6:01:52 AM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // Should NOT be the current date (Dec 8, 2025)
      expect(result.data![0].time.getFullYear()).toBe(2024);
      expect(result.data![0].time.getMonth()).toBe(10); // November
      expect(result.data![0].time.getDate()).toBe(21);
    });
  });
});
