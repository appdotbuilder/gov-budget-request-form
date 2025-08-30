import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, budgetItemsTable } from '../db/schema';
import { type CreateBudgetRequestInput, type CreateBudgetItemInput } from '../schema';
import { getBudgetItems } from '../handlers/get_budget_items';

// Test data
const testBudgetRequest: CreateBudgetRequestInput = {
  department_name: 'IT Department',
  department_code: 'IT',
  contact_person: 'John Doe',
  contact_email: 'john.doe@company.com',
  contact_phone: '555-0123',
  fiscal_year: 2024,
  request_title: 'Server Infrastructure Upgrade',
  request_description: 'Upgrade existing server infrastructure to handle increased workload',
  total_amount: 75000.00,
  priority_level: 'high',
  justification: 'Current servers are at capacity and affecting performance',
  expected_outcomes: 'Improved system performance and reliability',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-06-30'),
  status: 'draft'
};

const testBudgetItems: Omit<CreateBudgetItemInput, 'budget_request_id'>[] = [
  {
    category: 'capital_expenditure',
    description: 'Dell PowerEdge R740 Server',
    unit: 'unit',
    quantity: 2,
    unit_cost: 15000.00,
    total_cost: 30000.00,
    justification: 'Primary application servers'
  },
  {
    category: 'goods_services',
    description: 'Installation and Configuration Service',
    unit: 'service',
    quantity: 1,
    unit_cost: 5000.00,
    total_cost: 5000.00,
    justification: 'Professional installation required'
  },
  {
    category: 'capital_expenditure',
    description: 'Network Storage Array',
    unit: 'unit',
    quantity: 1,
    unit_cost: 25000.00,
    total_cost: 25000.00,
    justification: 'Centralized storage solution'
  }
];

describe('getBudgetItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return budget items for a specific budget request', async () => {
    // Create a budget request first
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create budget items
    await db.insert(budgetItemsTable)
      .values(testBudgetItems.map(item => ({
        ...item,
        budget_request_id: budgetRequestId,
        unit_cost: item.unit_cost.toString(),
        total_cost: item.total_cost.toString()
      })))
      .execute();

    const result = await getBudgetItems(budgetRequestId);

    // Should return all 3 items
    expect(result).toHaveLength(3);
    
    // Verify numeric conversions
    result.forEach(item => {
      expect(typeof item.unit_cost).toBe('number');
      expect(typeof item.total_cost).toBe('number');
      expect(item.budget_request_id).toBe(budgetRequestId);
    });

    // Check ordering - verify that items are sorted by category then creation date
    // The actual order depends on how PostgreSQL sorts the enum values
    const categories = result.map(item => item.category);
    expect(result).toHaveLength(3);
    
    // Group by category to verify sorting within categories
    const capitalExpenditureItems = result.filter(item => item.category === 'capital_expenditure');
    const goodsServicesItems = result.filter(item => item.category === 'goods_services');
    
    expect(capitalExpenditureItems).toHaveLength(2);
    expect(goodsServicesItems).toHaveLength(1);
    
    // Verify items are ordered by creation date within same category
    if (capitalExpenditureItems.length > 1) {
      expect(capitalExpenditureItems[0].created_at <= capitalExpenditureItems[1].created_at).toBe(true);
    }
  });

  it('should return items ordered by category then creation date', async () => {
    // Create a budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create items with different categories in reverse alphabetical order
    await db.insert(budgetItemsTable)
      .values([
        {
          category: 'training',
          description: 'Staff Training',
          unit: 'hours',
          quantity: 40,
          unit_cost: '100.00',
          total_cost: '4000.00',
          budget_request_id: budgetRequestId,
          justification: 'Required training'
        },
        {
          category: 'capital_expenditure',
          description: 'Equipment Purchase',
          unit: 'unit',
          quantity: 1,
          unit_cost: '10000.00',
          total_cost: '10000.00',
          budget_request_id: budgetRequestId,
          justification: 'Essential equipment'
        }
      ])
      .execute();

    const result = await getBudgetItems(budgetRequestId);

    expect(result).toHaveLength(2);
    // Should be ordered alphabetically by category
    expect(result[0].category).toBe('capital_expenditure');
    expect(result[1].category).toBe('training');
  });

  it('should return empty array when budget request has no items', async () => {
    // Create a budget request with no items
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    const result = await getBudgetItems(budgetRequestId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent budget request', async () => {
    const nonExistentId = 999999;

    const result = await getBudgetItems(nonExistentId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle items with null optional fields correctly', async () => {
    // Create a budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create item with null optional fields
    await db.insert(budgetItemsTable)
      .values([
        {
          category: 'operational',
          description: 'Monthly Service Fee',
          unit: null, // Null unit
          quantity: null, // Null quantity
          unit_cost: '1500.00',
          total_cost: '1500.00',
          budget_request_id: budgetRequestId,
          justification: null // Null justification
        }
      ])
      .execute();

    const result = await getBudgetItems(budgetRequestId);

    expect(result).toHaveLength(1);
    expect(result[0].unit).toBeNull();
    expect(result[0].quantity).toBeNull();
    expect(result[0].justification).toBeNull();
    expect(result[0].unit_cost).toBe(1500.00);
    expect(result[0].total_cost).toBe(1500.00);
  });

  it('should return only items for the specified budget request', async () => {
    // Create two budget requests
    const budgetRequest1 = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString(),
        request_title: 'Request 1'
      })
      .returning()
      .execute();

    const budgetRequest2 = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString(),
        request_title: 'Request 2'
      })
      .returning()
      .execute();

    const budgetRequestId1 = budgetRequest1[0].id;
    const budgetRequestId2 = budgetRequest2[0].id;

    // Create items for both requests
    await db.insert(budgetItemsTable)
      .values([
        {
          category: 'operational',
          description: 'Item for Request 1',
          unit: 'unit',
          quantity: 1,
          unit_cost: '1000.00',
          total_cost: '1000.00',
          budget_request_id: budgetRequestId1,
          justification: 'For request 1'
        },
        {
          category: 'operational',
          description: 'Item for Request 2',
          unit: 'unit',
          quantity: 1,
          unit_cost: '2000.00',
          total_cost: '2000.00',
          budget_request_id: budgetRequestId2,
          justification: 'For request 2'
        }
      ])
      .execute();

    const result1 = await getBudgetItems(budgetRequestId1);
    const result2 = await getBudgetItems(budgetRequestId2);

    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
    expect(result1[0].description).toBe('Item for Request 1');
    expect(result2[0].description).toBe('Item for Request 2');
    expect(result1[0].total_cost).toBe(1000.00);
    expect(result2[0].total_cost).toBe(2000.00);
  });
});