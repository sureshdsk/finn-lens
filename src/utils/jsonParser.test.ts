import { describe, it, expect } from 'vitest';
import { parseGroupExpensesJSON } from './jsonParser';

describe('jsonParser', () => {
  describe('parseGroupExpensesJSON', () => {
    it('should parse valid group expenses JSON', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "john@example.com",
      "group_name": "Weekend Trip",
      "total_amount": "₹5,000.00",
      "state": "COMPLETED",
      "title": "Hotel Booking",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        creator: 'john@example.com',
        groupName: 'Weekend Trip',
        state: 'COMPLETED',
        title: 'Hotel Booking',
      });
      expect(result.data![0].totalAmount).toEqual({
        value: 5000,
        currency: 'INR',
      });
    });

    it('should handle Google anti-XSSI prefix', () => {
      const jsonContent = `)]}'\n{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "test@example.com",
      "group_name": "Test Group",
      "total_amount": "₹1,000.00",
      "state": "ONGOING",
      "title": "Test Expense",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should parse multiple group expenses', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user1@example.com",
      "group_name": "Group 1",
      "total_amount": "₹1,000.00",
      "state": "COMPLETED",
      "title": "Expense 1",
      "items": []
    },
    {
      "creation_time": "2024-06-16T10:30:00Z",
      "creator": "user2@example.com",
      "group_name": "Group 2",
      "total_amount": "₹2,000.00",
      "state": "ONGOING",
      "title": "Expense 2",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].totalAmount.value).toBe(1000);
      expect(result.data![1].totalAmount.value).toBe(2000);
    });

    it('should parse amounts correctly', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "₹100.50",
      "state": "COMPLETED",
      "title": "Test",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].totalAmount.value).toBe(100.5);
    });

    it('should handle USD currency', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "$50.00",
      "state": "COMPLETED",
      "title": "Test",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].totalAmount).toEqual({
        value: 50,
        currency: 'USD',
      });
    });

    it('should parse dates correctly', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "₹1,000.00",
      "state": "COMPLETED",
      "title": "Test",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].creationTime).toBeInstanceOf(Date);
      expect(result.data![0].creationTime.getFullYear()).toBe(2024);
      expect(result.data![0].creationTime.getMonth()).toBe(5); // June is month 5 (0-indexed)
    });

    it('should handle empty group expenses array', () => {
      const jsonContent = `{
  "Group_expenses": []
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle missing Group_expenses key', () => {
      const jsonContent = `{}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully', () => {
      const jsonContent = `{invalid json}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle different expense states', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "₹1,000.00",
      "state": "ONGOING",
      "title": "Test 1",
      "items": []
    },
    {
      "creation_time": "2024-06-16T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "₹2,000.00",
      "state": "CLOSED",
      "title": "Test 2",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].state).toBe('ONGOING');
      expect(result.data![1].state).toBe('CLOSED');
    });

    it('should handle group expenses with items', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "user@example.com",
      "group_name": "Test",
      "total_amount": "₹1,000.00",
      "state": "COMPLETED",
      "title": "Dinner",
      "items": [
        {
          "amount": "₹500.00",
          "state": "PAID_RECEIVED",
          "payer": "Alice"
        },
        {
          "amount": "₹500.00",
          "state": "UNPAID",
          "payer": "Bob"
        }
      ]
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].items).toHaveLength(2);
      expect(result.data![0].items[0].payer).toBe('Alice');
      expect(result.data![0].items[1].payer).toBe('Bob');
    });

    it('should handle empty strings in required fields', () => {
      const jsonContent = `{
  "Group_expenses": [
    {
      "creation_time": "2024-06-15T10:30:00Z",
      "creator": "",
      "group_name": "Test",
      "total_amount": "₹1,000.00",
      "state": "COMPLETED",
      "title": "",
      "items": []
    }
  ]
}`;

      const result = parseGroupExpensesJSON(jsonContent);

      expect(result.success).toBe(true);
      expect(result.data![0].creator).toBe('');
      expect(result.data![0].title).toBe('');
    });
  });
});
