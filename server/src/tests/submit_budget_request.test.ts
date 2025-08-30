import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { submitBudgetRequest } from '../handlers/submit_budget_request';
import { eq } from 'drizzle-orm';
import type { CreateBudgetRequestInput } from '../schema';

// Complete test input with all required fields
const completeBudgetRequestInput: CreateBudgetRequestInput = {
  department_name: 'Test Department',
  department_code: 'TEST001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@example.com',
  contact_phone: '555-0123',
  fiscal_year: 2024,
  request_title: 'Test Budget Request',
  request_description: 'This is a comprehensive test budget request description that meets minimum length requirements.',
  total_amount: 15000.50,
  priority_level: 'high',
  justification: 'This budget request is essential for maintaining operational efficiency and supporting departmental growth initiatives.',
  expected_outcomes: 'Improved operational capacity and enhanced service delivery to stakeholders.',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-12-31'),
  status: 'draft'
};

// Incomplete budget request (missing required fields)
const incompleteBudgetRequestInput = {
  department_name: '',
  department_code: null,
  contact_person: 'Jane Doe',
  contact_email: 'jane.doe@example.com',
  contact_phone: null,
  fiscal_year: 2024,
  request_title: '',
  request_description: 'Incomplete request description',
  total_amount: '0', // Will be converted to string in DB
  priority_level: 'medium' as const,
  justification: 'Some justification text',
  expected_outcomes: 'Some outcomes',
  timeline_start: null,
  timeline_end: null,
  status: 'draft' as const,
  submitted_at: null,
  reviewed_at: null,
  reviewer_notes: null,
  created_at: new Date(),
  updated_at: new Date()
};

describe('submitBudgetRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully submit a complete draft budget request', async () => {
    // Create a complete draft budget request
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...completeBudgetRequestInput,
        total_amount: completeBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const draftRequestId = insertResult[0].id;

    // Submit the budget request
    const result = await submitBudgetRequest(draftRequestId);

    // Verify the result
    expect(result.id).toEqual(draftRequestId);
    expect(result.status).toEqual('submitted');
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.total_amount).toEqual(15000.50);

    // Verify the database was updated
    const updatedRequests = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, draftRequestId))
      .execute();

    expect(updatedRequests).toHaveLength(1);
    const updatedRequest = updatedRequests[0];
    expect(updatedRequest.status).toEqual('submitted');
    expect(updatedRequest.submitted_at).toBeInstanceOf(Date);
    expect(updatedRequest.updated_at).toBeInstanceOf(Date);
    expect(parseFloat(updatedRequest.total_amount)).toEqual(15000.50);
  });

  it('should throw error when budget request does not exist', async () => {
    const nonExistentId = 99999;

    await expect(submitBudgetRequest(nonExistentId))
      .rejects.toThrow(/Budget request with id 99999 not found/);
  });

  it('should throw error when budget request is not in draft status', async () => {
    // Create a budget request with 'submitted' status
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...completeBudgetRequestInput,
        total_amount: completeBudgetRequestInput.total_amount.toString(),
        status: 'submitted' as const,
        submitted_at: new Date()
      })
      .returning()
      .execute();

    const submittedRequestId = insertResult[0].id;

    await expect(submitBudgetRequest(submittedRequestId))
      .rejects.toThrow(/is not in draft status. Current status: submitted/);
  });

  it('should throw error when required fields are missing', async () => {
    // Create an incomplete budget request
    const insertResult = await db.insert(budgetRequestsTable)
      .values(incompleteBudgetRequestInput)
      .returning()
      .execute();

    const incompleteRequestId = insertResult[0].id;

    await expect(submitBudgetRequest(incompleteRequestId))
      .rejects.toThrow(/Missing required fields: department_name, request_title/);
  });

  it('should throw error when total amount is zero', async () => {
    // Create a budget request with zero total amount
    const zeroAmountInput = {
      ...completeBudgetRequestInput,
      total_amount: '0.00'
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values(zeroAmountInput)
      .returning()
      .execute();

    const zeroAmountRequestId = insertResult[0].id;

    await expect(submitBudgetRequest(zeroAmountRequestId))
      .rejects.toThrow(/Total amount must be greater than 0/);
  });

  it('should throw error when total amount is negative', async () => {
    // Create a budget request with negative total amount
    const negativeAmountInput = {
      ...completeBudgetRequestInput,
      total_amount: '-100.00'
    };

    const insertResult = await db.insert(budgetRequestsTable)
      .values(negativeAmountInput)
      .returning()
      .execute();

    const negativeAmountRequestId = insertResult[0].id;

    await expect(submitBudgetRequest(negativeAmountRequestId))
      .rejects.toThrow(/Total amount must be greater than 0/);
  });

  it('should handle requests with approved status correctly', async () => {
    // Create a budget request with 'approved' status
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...completeBudgetRequestInput,
        total_amount: completeBudgetRequestInput.total_amount.toString(),
        status: 'approved' as const,
        submitted_at: new Date(),
        reviewed_at: new Date()
      })
      .returning()
      .execute();

    const approvedRequestId = insertResult[0].id;

    await expect(submitBudgetRequest(approvedRequestId))
      .rejects.toThrow(/is not in draft status. Current status: approved/);
  });

  it('should preserve all existing data when submitting', async () => {
    // Create a complete draft budget request
    const insertResult = await db.insert(budgetRequestsTable)
      .values({
        ...completeBudgetRequestInput,
        total_amount: completeBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const draftRequestId = insertResult[0].id;
    const originalCreatedAt = insertResult[0].created_at;

    // Submit the budget request
    const result = await submitBudgetRequest(draftRequestId);

    // Verify all original data is preserved
    expect(result.department_name).toEqual('Test Department');
    expect(result.department_code).toEqual('TEST001');
    expect(result.contact_person).toEqual('John Doe');
    expect(result.contact_email).toEqual('john.doe@example.com');
    expect(result.contact_phone).toEqual('555-0123');
    expect(result.fiscal_year).toEqual(2024);
    expect(result.request_title).toEqual('Test Budget Request');
    expect(result.priority_level).toEqual('high');
    expect(result.created_at).toEqual(originalCreatedAt);
    
    // Only status, submitted_at, and updated_at should change
    expect(result.status).toEqual('submitted');
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalCreatedAt).toBe(true);
  });
});