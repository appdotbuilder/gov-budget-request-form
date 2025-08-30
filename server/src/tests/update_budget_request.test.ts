import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type UpdateBudgetRequestInput, type CreateBudgetRequestInput } from '../schema';
import { updateBudgetRequest } from '../handlers/update_budget_request';
import { eq } from 'drizzle-orm';

// Helper function to create a test budget request
const createTestBudgetRequest = async (): Promise<number> => {
  const testRequest: CreateBudgetRequestInput = {
    department_name: 'IT Department',
    department_code: 'IT001',
    contact_person: 'John Smith',
    contact_email: 'john.smith@company.com',
    contact_phone: '+1-555-0123',
    fiscal_year: 2024,
    request_title: 'New Server Infrastructure',
    request_description: 'Request for new server hardware to support growing business needs',
    total_amount: 50000.00,
    priority_level: 'high',
    justification: 'Current servers are at capacity and affecting performance across all departments',
    expected_outcomes: 'Improved system performance and reliability for all users',
    timeline_start: new Date('2024-01-01'),
    timeline_end: new Date('2024-03-31'),
    status: 'draft'
  };

  const result = await db.insert(budgetRequestsTable)
    .values({
      ...testRequest,
      total_amount: testRequest.total_amount.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateBudgetRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a budget request with all fields', async () => {
    const requestId = await createTestBudgetRequest();

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      department_name: 'HR Department',
      department_code: 'HR001',
      contact_person: 'Jane Doe',
      contact_email: 'jane.doe@company.com',
      contact_phone: '+1-555-0456',
      fiscal_year: 2025,
      request_title: 'Employee Training Program',
      request_description: 'Updated request for comprehensive employee training program',
      total_amount: 75000.00,
      priority_level: 'medium',
      justification: 'Updated justification for employee development and retention',
      expected_outcomes: 'Updated expected outcomes for improved employee skills',
      timeline_start: new Date('2024-02-01'),
      timeline_end: new Date('2024-12-31'),
      status: 'submitted',
      reviewer_notes: 'Initial review notes'
    };

    const result = await updateBudgetRequest(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(requestId);
    expect(result.department_name).toEqual('HR Department');
    expect(result.department_code).toEqual('HR001');
    expect(result.contact_person).toEqual('Jane Doe');
    expect(result.contact_email).toEqual('jane.doe@company.com');
    expect(result.contact_phone).toEqual('+1-555-0456');
    expect(result.fiscal_year).toEqual(2025);
    expect(result.request_title).toEqual('Employee Training Program');
    expect(result.request_description).toEqual('Updated request for comprehensive employee training program');
    expect(result.total_amount).toEqual(75000.00);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.priority_level).toEqual('medium');
    expect(result.justification).toEqual('Updated justification for employee development and retention');
    expect(result.expected_outcomes).toEqual('Updated expected outcomes for improved employee skills');
    expect(result.timeline_start).toEqual(new Date('2024-02-01'));
    expect(result.timeline_end).toEqual(new Date('2024-12-31'));
    expect(result.status).toEqual('submitted');
    expect(result.reviewer_notes).toEqual('Initial review notes');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const requestId = await createTestBudgetRequest();

    // Get original request to compare unchanged fields
    const originalRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, requestId))
      .execute();

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      department_name: 'Finance Department',
      total_amount: 25000.00,
      status: 'under_review'
    };

    const result = await updateBudgetRequest(updateInput);

    // Verify only specified fields were updated
    expect(result.department_name).toEqual('Finance Department');
    expect(result.total_amount).toEqual(25000.00);
    expect(result.status).toEqual('under_review');

    // Verify other fields remained unchanged
    expect(result.contact_person).toEqual(originalRequest[0].contact_person);
    expect(result.contact_email).toEqual(originalRequest[0].contact_email);
    expect(result.fiscal_year).toEqual(originalRequest[0].fiscal_year);
    expect(result.request_title).toEqual(originalRequest[0].request_title);
    expect(result.priority_level).toEqual(originalRequest[0].priority_level);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const requestId = await createTestBudgetRequest();

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      department_code: null,
      contact_phone: null,
      timeline_start: null,
      timeline_end: null,
      reviewer_notes: null
    };

    const result = await updateBudgetRequest(updateInput);

    expect(result.department_code).toBeNull();
    expect(result.contact_phone).toBeNull();
    expect(result.timeline_start).toBeNull();
    expect(result.timeline_end).toBeNull();
    expect(result.reviewer_notes).toBeNull();
  });

  it('should save updated budget request to database', async () => {
    const requestId = await createTestBudgetRequest();

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      department_name: 'Marketing Department',
      total_amount: 30000.00,
      priority_level: 'low'
    };

    await updateBudgetRequest(updateInput);

    // Query database to verify changes were persisted
    const updatedRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, requestId))
      .execute();

    expect(updatedRequest).toHaveLength(1);
    expect(updatedRequest[0].department_name).toEqual('Marketing Department');
    expect(parseFloat(updatedRequest[0].total_amount)).toEqual(30000.00);
    expect(updatedRequest[0].priority_level).toEqual('low');
    expect(updatedRequest[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const requestId = await createTestBudgetRequest();

    // Get original timestamp
    const originalRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, requestId))
      .execute();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      department_name: 'Updated Department'
    };

    const result = await updateBudgetRequest(updateInput);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(originalRequest[0].updated_at.getTime());
  });

  it('should throw error for non-existent budget request', async () => {
    const updateInput: UpdateBudgetRequestInput = {
      id: 99999,
      department_name: 'Non-existent Department'
    };

    await expect(updateBudgetRequest(updateInput)).rejects.toThrow(/Budget request with ID 99999 not found/i);
  });

  it('should handle numeric precision correctly', async () => {
    const requestId = await createTestBudgetRequest();

    const updateInput: UpdateBudgetRequestInput = {
      id: requestId,
      total_amount: 123456.78
    };

    const result = await updateBudgetRequest(updateInput);

    expect(result.total_amount).toEqual(123456.78);
    expect(typeof result.total_amount).toEqual('number');

    // Verify in database
    const dbResult = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, requestId))
      .execute();

    expect(parseFloat(dbResult[0].total_amount)).toEqual(123456.78);
  });
});