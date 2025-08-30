import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type GetBudgetRequestsQuery, type CreateBudgetRequestInput } from '../schema';
import { getBudgetRequests } from '../handlers/get_budget_requests';

// Test data for creating budget requests
const testBudgetRequest1: CreateBudgetRequestInput = {
  department_name: 'Engineering',
  department_code: 'ENG001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@company.com',
  contact_phone: '+1-555-0123',
  fiscal_year: 2024,
  request_title: 'New Development Tools',
  request_description: 'Request for purchasing new development tools and software licenses',
  total_amount: 50000.00,
  priority_level: 'high',
  justification: 'These tools will significantly improve our development productivity and code quality',
  expected_outcomes: 'Faster development cycles and better code quality',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-12-31'),
  status: 'submitted'
};

const testBudgetRequest2: CreateBudgetRequestInput = {
  department_name: 'Marketing',
  department_code: 'MKT001',
  contact_person: 'Jane Smith',
  contact_email: 'jane.smith@company.com',
  contact_phone: '+1-555-0456',
  fiscal_year: 2024,
  request_title: 'Marketing Campaign Budget',
  request_description: 'Budget allocation for Q2 marketing campaigns across digital platforms',
  total_amount: 75000.00,
  priority_level: 'medium',
  justification: 'Marketing campaigns are essential for customer acquisition and brand awareness',
  expected_outcomes: 'Increased brand visibility and customer acquisition',
  timeline_start: new Date('2024-04-01'),
  timeline_end: new Date('2024-06-30'),
  status: 'approved'
};

const testBudgetRequest3: CreateBudgetRequestInput = {
  department_name: 'Engineering',
  department_code: 'ENG001',
  contact_person: 'Bob Johnson',
  contact_email: 'bob.johnson@company.com',
  contact_phone: '+1-555-0789',
  fiscal_year: 2025,
  request_title: 'Server Infrastructure Upgrade',
  request_description: 'Upgrade existing server infrastructure to handle increased load',
  total_amount: 125000.00,
  priority_level: 'critical',
  justification: 'Current infrastructure is at capacity and affecting performance',
  expected_outcomes: 'Improved system performance and reliability',
  timeline_start: new Date('2025-01-01'),
  timeline_end: new Date('2025-03-31'),
  status: 'under_review'
};

// Helper function to create budget requests in database
const createBudgetRequest = async (input: CreateBudgetRequestInput) => {
  const result = await db.insert(budgetRequestsTable)
    .values({
      department_name: input.department_name,
      department_code: input.department_code,
      contact_person: input.contact_person,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone,
      fiscal_year: input.fiscal_year,
      request_title: input.request_title,
      request_description: input.request_description,
      total_amount: input.total_amount.toString(),
      priority_level: input.priority_level,
      justification: input.justification,
      expected_outcomes: input.expected_outcomes,
      timeline_start: input.timeline_start,
      timeline_end: input.timeline_end,
      status: input.status
    })
    .returning()
    .execute();

  return result[0];
};

describe('getBudgetRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty results when no budget requests exist', async () => {
    const query: GetBudgetRequestsQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.has_more).toBe(false);
  });

  it('should return all budget requests without filters', async () => {
    // Create test data
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.has_more).toBe(false);

    // Verify numeric conversion
    result.data.forEach(request => {
      expect(typeof request.total_amount).toBe('number');
      expect(request.total_amount).toBeGreaterThan(0);
    });

    // Verify ordering (newest first)
    expect(result.data[0].request_title).toBe('Server Infrastructure Upgrade');
    expect(result.data[2].request_title).toBe('New Development Tools');
  });

  it('should filter by department name', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      department_name: 'Engineering',
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.has_more).toBe(false);

    result.data.forEach(request => {
      expect(request.department_name).toBe('Engineering');
    });
  });

  it('should filter by fiscal year', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      fiscal_year: 2024,
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.has_more).toBe(false);

    result.data.forEach(request => {
      expect(request.fiscal_year).toBe(2024);
    });
  });

  it('should filter by status', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      status: 'approved',
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.has_more).toBe(false);
    expect(result.data[0].status).toBe('approved');
    expect(result.data[0].request_title).toBe('Marketing Campaign Budget');
  });

  it('should filter by priority level', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      priority_level: 'critical',
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.has_more).toBe(false);
    expect(result.data[0].priority_level).toBe('critical');
    expect(result.data[0].request_title).toBe('Server Infrastructure Upgrade');
  });

  it('should apply multiple filters simultaneously', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    const query: GetBudgetRequestsQuery = {
      department_name: 'Engineering',
      fiscal_year: 2024,
      priority_level: 'high',
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.has_more).toBe(false);
    expect(result.data[0].department_name).toBe('Engineering');
    expect(result.data[0].fiscal_year).toBe(2024);
    expect(result.data[0].priority_level).toBe('high');
    expect(result.data[0].request_title).toBe('New Development Tools');
  });

  it('should handle pagination correctly', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);
    await createBudgetRequest(testBudgetRequest3);

    // First page
    const firstPageQuery: GetBudgetRequestsQuery = {
      limit: 2,
      offset: 0
    };

    const firstPageResult = await getBudgetRequests(firstPageQuery);

    expect(firstPageResult.data).toHaveLength(2);
    expect(firstPageResult.total).toBe(3);
    expect(firstPageResult.limit).toBe(2);
    expect(firstPageResult.offset).toBe(0);
    expect(firstPageResult.has_more).toBe(true);

    // Second page
    const secondPageQuery: GetBudgetRequestsQuery = {
      limit: 2,
      offset: 2
    };

    const secondPageResult = await getBudgetRequests(secondPageQuery);

    expect(secondPageResult.data).toHaveLength(1);
    expect(secondPageResult.total).toBe(3);
    expect(secondPageResult.limit).toBe(2);
    expect(secondPageResult.offset).toBe(2);
    expect(secondPageResult.has_more).toBe(false);

    // Verify different records on different pages
    const firstPageIds = firstPageResult.data.map(r => r.id);
    const secondPageIds = secondPageResult.data.map(r => r.id);
    expect(firstPageIds).not.toEqual(secondPageIds);
  });

  it('should return no results when filters match nothing', async () => {
    await createBudgetRequest(testBudgetRequest1);
    await createBudgetRequest(testBudgetRequest2);

    const query: GetBudgetRequestsQuery = {
      department_name: 'NonExistentDepartment',
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.has_more).toBe(false);
  });

  it('should use default limit and offset from Zod schema', async () => {
    await createBudgetRequest(testBudgetRequest1);

    // Query with defaults applied - should use Zod defaults
    const query: GetBudgetRequestsQuery = {
      limit: 20, // Zod default
      offset: 0  // Zod default
    };

    const result = await getBudgetRequests(query);

    expect(result.limit).toBe(20); // Default limit
    expect(result.offset).toBe(0); // Default offset
  });

  it('should preserve all budget request fields in response', async () => {
    await createBudgetRequest(testBudgetRequest1);

    const query: GetBudgetRequestsQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getBudgetRequests(query);

    expect(result.data).toHaveLength(1);
    const budgetRequest = result.data[0];

    // Verify all required fields are present
    expect(budgetRequest.id).toBeDefined();
    expect(budgetRequest.department_name).toBe('Engineering');
    expect(budgetRequest.department_code).toBe('ENG001');
    expect(budgetRequest.contact_person).toBe('John Doe');
    expect(budgetRequest.contact_email).toBe('john.doe@company.com');
    expect(budgetRequest.contact_phone).toBe('+1-555-0123');
    expect(budgetRequest.fiscal_year).toBe(2024);
    expect(budgetRequest.request_title).toBe('New Development Tools');
    expect(budgetRequest.request_description).toBe('Request for purchasing new development tools and software licenses');
    expect(budgetRequest.total_amount).toBe(50000.00);
    expect(budgetRequest.priority_level).toBe('high');
    expect(budgetRequest.justification).toBe('These tools will significantly improve our development productivity and code quality');
    expect(budgetRequest.expected_outcomes).toBe('Faster development cycles and better code quality');
    expect(budgetRequest.timeline_start).toBeInstanceOf(Date);
    expect(budgetRequest.timeline_end).toBeInstanceOf(Date);
    expect(budgetRequest.status).toBe('submitted');
    expect(budgetRequest.created_at).toBeInstanceOf(Date);
    expect(budgetRequest.updated_at).toBeInstanceOf(Date);
  });
});