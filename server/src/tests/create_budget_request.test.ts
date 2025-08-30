import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type CreateBudgetRequestInput } from '../schema';
import { createBudgetRequest } from '../handlers/create_budget_request';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateBudgetRequestInput = {
  department_name: 'Information Technology',
  department_code: 'IT',
  contact_person: 'John Doe',
  contact_email: 'john.doe@company.com',
  contact_phone: '+1-555-0123',
  fiscal_year: 2024,
  request_title: 'Server Infrastructure Upgrade',
  request_description: 'Comprehensive upgrade of server infrastructure to support growing business needs and improve system reliability',
  total_amount: 75000.50,
  priority_level: 'high',
  justification: 'Current servers are reaching end-of-life and causing frequent downtime affecting business operations',
  expected_outcomes: 'Improved system reliability, reduced downtime, and better performance for all users',
  timeline_start: new Date('2024-01-15'),
  timeline_end: new Date('2024-03-31'),
  status: 'draft'
};

// Minimal test input
const minimalTestInput: CreateBudgetRequestInput = {
  department_name: 'Human Resources',
  department_code: null,
  contact_person: 'Jane Smith',
  contact_email: 'jane.smith@company.com',
  contact_phone: null,
  fiscal_year: 2024,
  request_title: 'Training Program',
  request_description: 'Employee development training program for skill enhancement',
  total_amount: 15000,
  priority_level: 'medium',
  justification: 'Investing in employee development to improve productivity and job satisfaction',
  expected_outcomes: 'Better skilled workforce and improved employee retention rates',
  timeline_start: null,
  timeline_end: null,
  status: 'draft'
};

describe('createBudgetRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a budget request with all fields', async () => {
    const result = await createBudgetRequest(testInput);

    // Verify basic field mapping
    expect(result.department_name).toEqual('Information Technology');
    expect(result.department_code).toEqual('IT');
    expect(result.contact_person).toEqual('John Doe');
    expect(result.contact_email).toEqual('john.doe@company.com');
    expect(result.contact_phone).toEqual('+1-555-0123');
    expect(result.fiscal_year).toEqual(2024);
    expect(result.request_title).toEqual('Server Infrastructure Upgrade');
    expect(result.request_description).toEqual(testInput.request_description);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.total_amount).toEqual(75000.50);
    expect(result.priority_level).toEqual('high');
    expect(result.justification).toEqual(testInput.justification);
    expect(result.expected_outcomes).toEqual(testInput.expected_outcomes);
    expect(result.timeline_start).toEqual(testInput.timeline_start);
    expect(result.timeline_end).toEqual(testInput.timeline_end);
    expect(result.status).toEqual('draft');

    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.submitted_at).toBeNull();
    expect(result.reviewed_at).toBeNull();
    expect(result.reviewer_notes).toBeNull();
  });

  it('should create a budget request with minimal fields', async () => {
    const result = await createBudgetRequest(minimalTestInput);

    // Verify required fields
    expect(result.department_name).toEqual('Human Resources');
    expect(result.department_code).toBeNull();
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.contact_email).toEqual('jane.smith@company.com');
    expect(result.contact_phone).toBeNull();
    expect(result.fiscal_year).toEqual(2024);
    expect(result.request_title).toEqual('Training Program');
    expect(result.request_description).toEqual(minimalTestInput.request_description);
    expect(typeof result.total_amount).toEqual('number');
    expect(result.total_amount).toEqual(15000);
    expect(result.priority_level).toEqual('medium');
    expect(result.timeline_start).toBeNull();
    expect(result.timeline_end).toBeNull();
    expect(result.status).toEqual('draft');

    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save budget request to database', async () => {
    const result = await createBudgetRequest(testInput);

    // Query database to verify persistence
    const budgetRequests = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, result.id))
      .execute();

    expect(budgetRequests).toHaveLength(1);
    const savedRequest = budgetRequests[0];
    
    expect(savedRequest.department_name).toEqual('Information Technology');
    expect(savedRequest.department_code).toEqual('IT');
    expect(savedRequest.contact_person).toEqual('John Doe');
    expect(savedRequest.contact_email).toEqual('john.doe@company.com');
    expect(savedRequest.fiscal_year).toEqual(2024);
    expect(savedRequest.request_title).toEqual('Server Infrastructure Upgrade');
    expect(parseFloat(savedRequest.total_amount)).toEqual(75000.50);
    expect(savedRequest.priority_level).toEqual('high');
    expect(savedRequest.status).toEqual('draft');
    expect(savedRequest.created_at).toBeInstanceOf(Date);
    expect(savedRequest.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different priority levels correctly', async () => {
    const criticalInput = { ...testInput, priority_level: 'critical' as const };
    const lowInput = { ...testInput, priority_level: 'low' as const };

    const criticalResult = await createBudgetRequest(criticalInput);
    const lowResult = await createBudgetRequest(lowInput);

    expect(criticalResult.priority_level).toEqual('critical');
    expect(lowResult.priority_level).toEqual('low');

    // Verify both are saved in database
    const requests = await db.select()
      .from(budgetRequestsTable)
      .execute();

    expect(requests).toHaveLength(2);
    const priorities = requests.map(r => r.priority_level).sort();
    expect(priorities).toEqual(['critical', 'low']);
  });

  it('should handle different status values correctly', async () => {
    const submittedInput = { ...testInput, status: 'submitted' as const };
    const result = await createBudgetRequest(submittedInput);

    expect(result.status).toEqual('submitted');

    // Verify in database
    const savedRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, result.id))
      .execute();

    expect(savedRequest[0].status).toEqual('submitted');
  });

  it('should handle numeric precision correctly', async () => {
    const preciseInput = { ...testInput, total_amount: 12345.67 };
    const result = await createBudgetRequest(preciseInput);

    expect(typeof result.total_amount).toEqual('number');
    expect(result.total_amount).toEqual(12345.67);

    // Verify precision is maintained in database
    const savedRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, result.id))
      .execute();

    expect(parseFloat(savedRequest[0].total_amount)).toEqual(12345.67);
  });

  it('should handle date fields correctly', async () => {
    const startDate = new Date('2024-06-01T00:00:00Z');
    const endDate = new Date('2024-12-31T23:59:59Z');
    
    const dateInput = {
      ...testInput,
      timeline_start: startDate,
      timeline_end: endDate
    };

    const result = await createBudgetRequest(dateInput);

    expect(result.timeline_start).toEqual(startDate);
    expect(result.timeline_end).toEqual(endDate);

    // Verify dates are saved correctly in database
    const savedRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, result.id))
      .execute();

    expect(savedRequest[0].timeline_start).toEqual(startDate);
    expect(savedRequest[0].timeline_end).toEqual(endDate);
  });
});