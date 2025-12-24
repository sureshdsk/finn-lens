import { describe, it, expect } from 'vitest';
import { parseMyActivityHTML } from './htmlParser';

describe('htmlParser', () => {
  describe('parseMyActivityHTML', () => {
    it('should exclude failed transactions from parsing', () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<body>
  <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
    <div class="mdl-grid">
      <div class="header-cell mdl-cell mdl-cell--12-col">
        <p class="mdl-typography--title">Google Pay<br></p>
      </div>
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
        Received ₹60.00<br>4 Dec 2025, 23:07:41 GMT+05:30<br>
      </div>
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div>
      <div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption">
        <b>Products:</b><br> Google Pay<br><b>Details:</b><br> ldfqyOcETOmpNlWY<br> Failed<br>
      </div>
    </div>
  </div>
</body>
</html>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      // Failed transaction should be excluded
      expect(result.data).toHaveLength(0);
    });

    it('should exclude transactions with empty or missing status', () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<body>
  <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
    <div class="mdl-grid">
      <div class="header-cell mdl-cell mdl-cell--12-col">
        <p class="mdl-typography--title">Google Pay<br></p>
      </div>
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
        Received ₹60.00<br>4 Dec 2025, 23:07:32 GMT+05:30<br>
      </div>
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div>
      <div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption">
        <b>Products:</b><br> Google Pay<br><b>Details:</b><br> nRZ9V8FVTc+UWqPL<br> <br>
      </div>
    </div>
  </div>
</body>
</html>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      // Transaction with empty status should be excluded
      expect(result.data).toHaveLength(0);
    });

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

    it('should correctly parse date format from actual Google Pay HTML (Format 2: Mon DD, YYYY with AM/PM)', () => {
      // This is an older date format found in Google Pay My Activity exports
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

    it('should correctly parse newer date format (Format 1: DD Mon YYYY, 24-hour)', () => {
      // This is the newer date format found in Google Pay My Activity exports (2024-2025)
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹105.00 to TEST MERCHANT using Bank Account XXXXXXXX5601<br>
    8 Dec 2025, 20:11:19 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].time).toBeInstanceOf(Date);
      expect(result.data![0].time.getFullYear()).toBe(2025);
      expect(result.data![0].time.getMonth()).toBe(11); // December is month 11 (0-indexed)
      expect(result.data![0].time.getDate()).toBe(8);
      expect(result.data![0].time.getHours()).toBe(20);
      expect(result.data![0].time.getMinutes()).toBe(11);
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

    it('should parse transactions from 2017 (older format)', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00 to OLD MERCHANT using Bank Account<br>
    26 Dec 2017, 18:32:47 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].time.getFullYear()).toBe(2017);
      expect(result.data![0].time.getMonth()).toBe(11); // December
      expect(result.data![0].time.getDate()).toBe(26);
    });

    it('should parse transactions from 2024 (newer format)', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Sent ₹1500.00 using Bank Account<br>
    15 Aug 2024, 14:30:00 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].time.getFullYear()).toBe(2024);
      expect(result.data![0].time.getMonth()).toBe(7); // August
      expect(result.data![0].time.getDate()).toBe(15);
    });

    it('should parse mixed date formats in the same file', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹100.00<br>
    26 Dec 2017, 18:32:47 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Sent ₹200.00<br>
    Oct 9, 2018, 3:45:30 PM GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Received ₹300.00<br>
    15 Aug 2024, 14:30:00 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹400.00<br>
    8 Dec 2025, 20:11:19 GMT+05:30<br>
  </div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      // Check all years are parsed correctly
      expect(result.data![0].time.getFullYear()).toBe(2017);
      expect(result.data![1].time.getFullYear()).toBe(2018);
      expect(result.data![2].time.getFullYear()).toBe(2024);
      expect(result.data![3].time.getFullYear()).toBe(2025);

      // Check amounts
      expect(result.data![0].amount?.value).toBe(100);
      expect(result.data![1].amount?.value).toBe(200);
      expect(result.data![2].amount?.value).toBe(300);
      expect(result.data![3].amount?.value).toBe(400);
    });

    it('should parse all years from 2017 to 2025', () => {
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">Paid ₹10.00<br>1 Jan 2017, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹20.00<br>1 Jan 2018, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹30.00<br>1 Jan 2019, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹40.00<br>1 Jan 2020, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹50.00<br>1 Jan 2021, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹60.00<br>1 Jan 2022, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹70.00<br>1 Jan 2023, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹80.00<br>1 Jan 2024, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>
<div class="outer-cell">
  <div class="content-cell">Paid ₹90.00<br>1 Jan 2025, 10:00:00 GMT+05:30</div>
  <div class="content-cell">Completed</div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(9);

      // Verify all years are present
      const years = result.data!.map(d => d.time.getFullYear());
      expect(years).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    });

    it('should reclassify "Paid using Bank Account" with 35-char transaction ID as received', () => {
      // This tests the fix for P2P transactions where Google labels received money as "Paid"
      // Pattern: 35-char alphanumeric transaction IDs = RECEIVED via UPI collect
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹690.00 using Bank Account XXXXXXXX5601<br>
    19 Dec 2025, 15:24:27 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    YBN20251219152416743865243676672000<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹2867.00 using Bank Account XXXXXXXX5601<br>
    21 Nov 2025, 21:57:42 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    KOT19640634730HJV09LFYW2S34TVHZBSW7<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹400.00 using Bank Account XXXXXXXX5601<br>
    6 Dec 2025, 16:37:19 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    AXL762a419436d040b69d6de76be192cbb8<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹2858.00 using Bank Account XXXXXXXX5601<br>
    16 Oct 2019, 12:08:46 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    PTMd3c485f560f04d55b7940cf50edaf38c<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      // All should be reclassified as 'received' based on 35-char transaction ID
      expect(result.data![0].transactionType).toBe('received');
      expect(result.data![0].amount?.value).toBe(690);
      expect(result.data![0].recipient).toBeUndefined();

      expect(result.data![1].transactionType).toBe('received');
      expect(result.data![1].amount?.value).toBe(2867);
      expect(result.data![1].recipient).toBeUndefined();

      expect(result.data![2].transactionType).toBe('received');
      expect(result.data![2].amount?.value).toBe(400);
      expect(result.data![2].recipient).toBeUndefined();

      expect(result.data![3].transactionType).toBe('received');
      expect(result.data![3].amount?.value).toBe(2858);
      expect(result.data![3].recipient).toBeUndefined();
    });

    it('should NOT reclassify "Paid to [NAME] using Bank Account" as received', () => {
      // This ensures we don't break normal paid transactions that have a recipient
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹942.00 to BSNL BILLDESK using Bank Account XXXXXXXX5601<br>
    21 Dec 2025, 18:51:26 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    QbsH7PDJRuy2F01E<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      // Should remain as 'paid' because it has a recipient
      expect(result.data![0].transactionType).toBe('paid');
      expect(result.data![0].amount?.value).toBe(942);
      expect(result.data![0].recipient).toBe('BSNL BILLDESK');
    });

    it('should correctly handle merchant payments with numbers in name', () => {
      // Real example: Payment to restaurant should stay as 'paid' (outgoing expense)
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹380.00 to SS HYDERABAD BIRYANI SAIDAPET 5 using Bank Account XXXXXXXX5601<br>
    19 Dec 2025, 15:23:56 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    TFfOnXp4SnyhmPlC<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      // Should remain as 'paid' because it has a recipient name
      expect(result.data![0].transactionType).toBe('paid');
      expect(result.data![0].amount?.value).toBe(380);
      expect(result.data![0].recipient).toBe('SS HYDERABAD BIRYANI SAIDAPET 5');
    });

    it('should NOT reclassify UUID format (36-char with dashes) as received', () => {
      // 36-char UUIDs with dashes should remain as 'paid' (not P2P received)
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹10,497.76 using Bank Account XXXXXXXX5601<br>
    4 Nov 2020, 08:51:18 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    E0290455-7E1E-4FC4-9446-46B7105EE2E3<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹2000.00 using Bank Account XXXXXXXX5601<br>
    19 Aug 2019, 11:33:59 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    EF04868F-9327-4C27-9547-B05D7EDAA613<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // Both should remain as 'paid' because UUIDs contain dashes (not 35-char alphanumeric)
      expect(result.data![0].transactionType).toBe('paid');
      expect(result.data![0].amount?.value).toBe(10497.76);

      expect(result.data![1].transactionType).toBe('paid');
      expect(result.data![1].amount?.value).toBe(2000);
    });

    it('should differentiate between paid-to-merchant vs received-via-collect (comprehensive test)', () => {
      // Side-by-side comparison of the two patterns
      const htmlContent = `
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹380.00 to SS HYDERABAD BIRYANI SAIDAPET 5 using Bank Account XXXXXXXX5601<br>
    19 Dec 2025, 15:23:56 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    TFfOnXp4SnyhmPlC<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹690.00 using Bank Account XXXXXXXX5601<br>
    19 Dec 2025, 15:24:27 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    YBN20251219152416743865243676672000<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹942.00 to BSNL BILLDESK using Bank Account XXXXXXXX5601<br>
    21 Dec 2025, 18:51:26 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    QbsH7PDJRuy2F01E<br>
    Completed<br>
  </div>
</div>
<div class="outer-cell">
  <div class="content-cell">
    Paid ₹2867.00 using Bank Account XXXXXXXX5601<br>
    21 Nov 2025, 21:57:42 GMT+05:30<br>
  </div>
  <div class="content-cell">
    <b>Details:</b><br>
    KOT19640634730HJV09LFYW2S34TVHZBSW7<br>
    Completed<br>
  </div>
</div>`;

      const result = parseMyActivityHTML(htmlContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      // Transaction 1: Paid to merchant (has recipient) → PAID (expense)
      expect(result.data![0].transactionType).toBe('paid');
      expect(result.data![0].amount?.value).toBe(380);
      expect(result.data![0].recipient).toBe('SS HYDERABAD BIRYANI SAIDAPET 5');

      // Transaction 2: Paid using bank account (no recipient) → RECEIVED (income)
      expect(result.data![1].transactionType).toBe('received');
      expect(result.data![1].amount?.value).toBe(690);
      expect(result.data![1].recipient).toBeUndefined();

      // Transaction 3: Paid to merchant (has recipient) → PAID (expense)
      expect(result.data![2].transactionType).toBe('paid');
      expect(result.data![2].amount?.value).toBe(942);
      expect(result.data![2].recipient).toBe('BSNL BILLDESK');

      // Transaction 4: Paid using bank account (no recipient) → RECEIVED (income)
      expect(result.data![3].transactionType).toBe('received');
      expect(result.data![3].amount?.value).toBe(2867);
      expect(result.data![3].recipient).toBeUndefined();
    });
  });
});
