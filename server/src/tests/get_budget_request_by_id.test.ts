import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type CreateBudgetRequestInput } from '../schema';
import { getBudgetRequestById } from '../handlers/get_budget_request_by_id';
import { eq } from 'drizzle-orm';

// Test input for creating budget requests
const testInput: CreateBudgetRequestInput = {
  department_name: 'IT Department',
  department_code: 'IT001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@company.com',
  contact_phone: '+1-555-0123',
  fiscal_year: 2024,
  request_title: 'Server Infrastructure Upgrade',
  request_description: 'Upgrade existing server infrastructure to improve performance and reliability',
  total_amount: 50000.00,
  priority_level: 'high',
  justification: 'Current servers are outdated and causing frequent downtime affecting business operations',
  expected_outcomes: 'Improved system reliability, reduced downtime, and enhanced performance',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-06-30'),
  status: 'draft'
};

describe('getBudgetRequestById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return budget request by ID with correct data types', async () => {
    // Create a test budget request first
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...testInput,
        total_amount: testInput.total_amount.toString() // Convert to string for insertion
      })
      .returning()
      .execute();

    const createdRequest = insertResult[0];
    const result = await getBudgetRequestById(createdRequest.id);

    // Verify the result is not null
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdRequest.id);
    
    // Verify all fields match expected values
    expect(result!.department_name).toEqual('IT Department');
    expect(result!.department_code).toEqual('IT001');
    expect(result!.contact_person).toEqual('John Doe');
    expect(result!.contact_email).toEqual('john.doe@company.com');
    expect(result!.contact_phone).toEqual('+1-555-0123');
    expect(result!.fiscal_year).toEqual(2024);
    expect(result!.request_title).toEqual('Server Infrastructure Upgrade');
    expect(result!.request_description).toEqual('Upgrade existing server infrastructure to improve performance and reliability');
    expect(result!.priority_level).toEqual('high');
    expect(result!.justification).toEqual('Current servers are outdated and causing frequent downtime affecting business operations');
    expect(result!.expected_outcomes).toEqual('Improved system reliability, reduced downtime, and enhanced performance');
    expect(result!.status).toEqual('draft');
    
    // Verify numeric conversion
    expect(result!.total_amount).toEqual(50000.00);
    expect(typeof result!.total_amount).toEqual('number');
    
    // Verify date fields
    expect(result!.timeline_start).toBeInstanceOf(Date);
    expect(result!.timeline_end).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent ID', async () => {
    const result = await getBudgetRequestById(99999);
    expect(result).toBeNull();
  });

  it('should handle different priority levels correctly', async () => {
    // Test with different priority level
    const criticalInput = {
      ...testInput,
      priority_level: 'critical' as const,
      request_title: 'Critical Security Update'
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...criticalInput,
        total_amount: criticalInput.total_amount.toString()
      })
      .returning()
      .execute();

    const result = await getBudgetRequestById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.priority_level).toEqual('critical');
    expect(result!.request_title).toEqual('Critical Security Update');
  });

  it('should handle different status values correctly', async () => {
    // Test with submitted status
    const submittedInput = {
      ...testInput,
      status: 'submitted' as const,
      submitted_at: new Date()
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...submittedInput,
        total_amount: submittedInput.total_amount.toString()
      })
      .returning()
      .execute();

    const result = await getBudgetRequestById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('submitted');
    expect(result!.submitted_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Test with minimal required fields (nullable fields set to null)
    const minimalInput = {
      department_name: 'Marketing',
      department_code: null,
      contact_person: 'Jane Smith',
      contact_email: 'jane.smith@company.com',
      contact_phone: null,
      fiscal_year: 2024,
      request_title: 'Marketing Campaign',
      request_description: 'Annual marketing campaign budget request',
      total_amount: 25000.00,
      priority_level: 'medium' as const,
      justification: 'Need budget for upcoming marketing initiatives',
      expected_outcomes: 'Increased brand awareness and customer engagement',
      timeline_start: null,
      timeline_end: null,
      status: 'draft' as const
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...minimalInput,
        total_amount: minimalInput.total_amount.toString()
      })
      .returning()
      .execute();

    const result = await getBudgetRequestById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.department_code).toBeNull();
    expect(result!.contact_phone).toBeNull();
    expect(result!.timeline_start).toBeNull();
    expect(result!.timeline_end).toBeNull();
    expect(result!.submitted_at).toBeNull();
    expect(result!.reviewed_at).toBeNull();
    expect(result!.reviewer_notes).toBeNull();
  });

  it('should verify data persistence in database', async () => {
    // Create a budget request
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...testInput,
        total_amount: testInput.total_amount.toString()
      })
      .returning()
      .execute();

    const createdId = insertResult[0].id;
    
    // Fetch using handler
    const handlerResult = await getBudgetRequestById(createdId);
    
    // Verify by direct database query
    const directQuery = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, createdId))
      .execute();

    expect(handlerResult).not.toBeNull();
    expect(directQuery).toHaveLength(1);
    expect(handlerResult!.id).toEqual(directQuery[0].id);
    expect(handlerResult!.department_name).toEqual(directQuery[0].department_name);
    expect(handlerResult!.total_amount).toEqual(parseFloat(directQuery[0].total_amount));
  });

  it('should handle large monetary amounts correctly', async () => {
    // Test with large amount
    const largeAmountInput = {
      ...testInput,
      total_amount: 999999.99,
      request_title: 'Large Infrastructure Project'
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...largeAmountInput,
        total_amount: largeAmountInput.total_amount.toString()
      })
      .returning()
      .execute();

    const result = await getBudgetRequestById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.total_amount).toEqual(999999.99);
    expect(typeof result!.total_amount).toEqual('number');
  });
});