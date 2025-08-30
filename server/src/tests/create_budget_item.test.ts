import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, budgetItemsTable } from '../db/schema';
import { type CreateBudgetItemInput, type CreateBudgetRequestInput } from '../schema';
import { createBudgetItem } from '../handlers/create_budget_item';
import { eq } from 'drizzle-orm';

// Helper function to create a test budget request
const createTestBudgetRequest = async (): Promise<number> => {
  const testBudgetRequest: CreateBudgetRequestInput = {
    department_name: 'Engineering',
    department_code: 'ENG001',
    contact_person: 'John Doe',
    contact_email: 'john.doe@example.com',
    contact_phone: '+1-555-0123',
    fiscal_year: 2024,
    request_title: 'Software Development Tools',
    request_description: 'Request for new development tools and software licenses',
    total_amount: 50000.00,
    priority_level: 'high',
    justification: 'These tools are essential for improving development productivity and code quality',
    expected_outcomes: 'Faster development cycles and improved code quality',
    timeline_start: new Date('2024-01-01'),
    timeline_end: new Date('2024-12-31'),
    status: 'draft'
  };

  const result = await db.insert(budgetRequestsTable)
    .values({
      ...testBudgetRequest,
      total_amount: testBudgetRequest.total_amount.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

// Test input for budget item creation
const testInput: CreateBudgetItemInput = {
  budget_request_id: 0, // Will be set in tests
  category: 'goods_services',
  description: 'Software licenses for development team',
  unit: 'license',
  quantity: 10,
  unit_cost: 299.99,
  total_cost: 2999.90,
  justification: 'Required for team productivity'
};

describe('createBudgetItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a budget item successfully', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const input = { ...testInput, budget_request_id: budgetRequestId };

    const result = await createBudgetItem(input);

    // Verify basic fields
    expect(result.budget_request_id).toEqual(budgetRequestId);
    expect(result.category).toEqual('goods_services');
    expect(result.description).toEqual('Software licenses for development team');
    expect(result.unit).toEqual('license');
    expect(result.quantity).toEqual(10);
    expect(result.unit_cost).toEqual(299.99);
    expect(result.total_cost).toEqual(2999.90);
    expect(result.justification).toEqual('Required for team productivity');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.unit_cost).toBe('number');
    expect(typeof result.total_cost).toBe('number');
  });

  it('should save budget item to database', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const input = { ...testInput, budget_request_id: budgetRequestId };

    const result = await createBudgetItem(input);

    // Query the database to verify the budget item was saved
    const budgetItems = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, result.id))
      .execute();

    expect(budgetItems).toHaveLength(1);
    const savedItem = budgetItems[0];
    
    expect(savedItem.budget_request_id).toEqual(budgetRequestId);
    expect(savedItem.category).toEqual('goods_services');
    expect(savedItem.description).toEqual('Software licenses for development team');
    expect(savedItem.unit).toEqual('license');
    expect(savedItem.quantity).toEqual(10);
    expect(parseFloat(savedItem.unit_cost)).toEqual(299.99);
    expect(parseFloat(savedItem.total_cost)).toEqual(2999.90);
    expect(savedItem.justification).toEqual('Required for team productivity');
    expect(savedItem.created_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const input: CreateBudgetItemInput = {
      budget_request_id: budgetRequestId,
      category: 'personnel',
      description: 'Consultant services',
      unit: null,
      quantity: null,
      unit_cost: 5000.00,
      total_cost: 5000.00,
      justification: null
    };

    const result = await createBudgetItem(input);

    expect(result.unit).toBeNull();
    expect(result.quantity).toBeNull();
    expect(result.justification).toBeNull();
    expect(result.unit_cost).toEqual(5000.00);
    expect(result.total_cost).toEqual(5000.00);
  });

  it('should handle different budget categories', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    
    const categories: Array<'personnel' | 'goods_services' | 'capital_expenditure' | 'operational' | 'maintenance' | 'training' | 'travel' | 'other'> = [
      'personnel',
      'goods_services', 
      'capital_expenditure',
      'operational',
      'maintenance',
      'training',
      'travel',
      'other'
    ];

    for (const category of categories) {
      const input = {
        ...testInput,
        budget_request_id: budgetRequestId,
        category: category,
        description: `Test item for ${category}`
      };

      const result = await createBudgetItem(input);
      expect(result.category).toEqual(category);
    }
  });

  it('should throw error when budget request does not exist', async () => {
    const input = { ...testInput, budget_request_id: 99999 };

    await expect(createBudgetItem(input)).rejects.toThrow(/Budget request with id 99999 not found/i);
  });

  it('should throw error when budget request is approved', async () => {
    const budgetRequestId = await createTestBudgetRequest();

    // Update budget request status to approved
    await db.update(budgetRequestsTable)
      .set({ status: 'approved' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testInput, budget_request_id: budgetRequestId };

    await expect(createBudgetItem(input)).rejects.toThrow(/Cannot add budget items to a approved budget request/i);
  });

  it('should throw error when budget request is rejected', async () => {
    const budgetRequestId = await createTestBudgetRequest();

    // Update budget request status to rejected
    await db.update(budgetRequestsTable)
      .set({ status: 'rejected' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testInput, budget_request_id: budgetRequestId };

    await expect(createBudgetItem(input)).rejects.toThrow(/Cannot add budget items to a rejected budget request/i);
  });

  it('should allow adding items to draft budget requests', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const input = { ...testInput, budget_request_id: budgetRequestId };

    const result = await createBudgetItem(input);
    expect(result.id).toBeDefined();
  });

  it('should allow adding items to submitted budget requests', async () => {
    const budgetRequestId = await createTestBudgetRequest();

    // Update budget request status to submitted
    await db.update(budgetRequestsTable)
      .set({ status: 'submitted' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testInput, budget_request_id: budgetRequestId };

    const result = await createBudgetItem(input);
    expect(result.id).toBeDefined();
  });

  it('should handle precision in numeric fields', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const input: CreateBudgetItemInput = {
      budget_request_id: budgetRequestId,
      category: 'goods_services',
      description: 'Precision test item',
      unit: 'item',
      quantity: 3,
      unit_cost: 123.456789, // High precision input
      total_cost: 370.37, // Rounded total
      justification: 'Testing numeric precision'
    };

    const result = await createBudgetItem(input);

    // Verify precision is maintained appropriately
    expect(result.unit_cost).toBeCloseTo(123.456789, 2);
    expect(result.total_cost).toBeCloseTo(370.37, 2);
  });
});