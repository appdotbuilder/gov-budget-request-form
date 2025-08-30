import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, budgetItemsTable } from '../db/schema';
import { deleteBudgetItem } from '../handlers/delete_budget_item';
import { eq } from 'drizzle-orm';

// Test data for budget request
const testBudgetRequest = {
  department_name: 'IT Department',
  department_code: 'IT001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@example.com',
  contact_phone: '+1234567890',
  fiscal_year: 2024,
  request_title: 'Server Upgrade Request',
  request_description: 'Upgrade existing servers to improve performance',
  total_amount: '25000.00',
  priority_level: 'high' as const,
  justification: 'Current servers are outdated and causing performance issues',
  expected_outcomes: 'Improved system performance and reduced downtime',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-03-31'),
  status: 'draft' as const
};

// Test data for budget items
const testBudgetItem1 = {
  budget_request_id: 1, // Will be set after creating budget request
  category: 'capital_expenditure' as const,
  description: 'Server Hardware',
  unit: 'units',
  quantity: 2,
  unit_cost: '10000.00',
  total_cost: '20000.00',
  justification: 'New servers for improved performance'
};

const testBudgetItem2 = {
  budget_request_id: 1, // Will be set after creating budget request
  category: 'goods_services' as const,
  description: 'Installation Service',
  unit: 'hours',
  quantity: 10,
  unit_cost: '500.00',
  total_cost: '5000.00',
  justification: 'Professional installation required'
};

describe('deleteBudgetItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a budget item successfully and update parent total', async () => {
    // Create budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values(testBudgetRequest)
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create two budget items
    const item1Result = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const item2Result = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem2, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const item1Id = item1Result[0].id;

    // Delete the first budget item
    const result = await deleteBudgetItem(item1Id);

    // Should return true
    expect(result).toBe(true);

    // Verify the item was deleted
    const remainingItems = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.budget_request_id, budgetRequestId))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toBe(item2Result[0].id);

    // Verify parent budget request total was updated
    const updatedBudgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    expect(parseFloat(updatedBudgetRequest[0].total_amount)).toBe(5000.00);
  });

  it('should return false when budget item does not exist', async () => {
    const result = await deleteBudgetItem(999);
    expect(result).toBe(false);
  });

  it('should return false when parent budget request is not editable', async () => {
    // Create budget request with approved status
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({ ...testBudgetRequest, status: 'approved' })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create budget item
    const itemResult = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Try to delete the budget item
    const result = await deleteBudgetItem(itemId);

    // Should return false because budget request is not editable
    expect(result).toBe(false);

    // Verify the item was not deleted
    const items = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
  });

  it('should allow deletion when budget request is in revision_requested status', async () => {
    // Create budget request with revision_requested status
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({ ...testBudgetRequest, status: 'revision_requested' })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create budget item
    const itemResult = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Delete the budget item
    const result = await deleteBudgetItem(itemId);

    // Should return true
    expect(result).toBe(true);

    // Verify the item was deleted
    const items = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(0);
  });

  it('should set total_amount to 0 when deleting the last budget item', async () => {
    // Create budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values(testBudgetRequest)
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create only one budget item
    const itemResult = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Delete the only budget item
    const result = await deleteBudgetItem(itemId);

    // Should return true
    expect(result).toBe(true);

    // Verify parent budget request total is now 0
    const updatedBudgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    expect(parseFloat(updatedBudgetRequest[0].total_amount)).toBe(0);
  });

  it('should return false when parent budget request does not exist', async () => {
    // Create a budget item with non-existent budget_request_id
    // This shouldn't normally happen due to foreign key constraints,
    // but we test the handler's robustness
    
    // First create a valid budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values(testBudgetRequest)
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create budget item
    const itemResult = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Delete the parent budget request (this will cascade delete the item due to foreign key)
    await db.delete(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    // Try to delete the budget item (should return false since it no longer exists)
    const result = await deleteBudgetItem(itemId);
    expect(result).toBe(false);
  });

  it('should update the updated_at timestamp of parent budget request', async () => {
    // Create budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values(testBudgetRequest)
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;
    const originalUpdatedAt = budgetRequestResult[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create budget item
    const itemResult = await db.insert(budgetItemsTable)
      .values({ ...testBudgetItem1, budget_request_id: budgetRequestId })
      .returning()
      .execute();

    const itemId = itemResult[0].id;

    // Delete the budget item
    const result = await deleteBudgetItem(itemId);

    expect(result).toBe(true);

    // Verify updated_at timestamp was changed
    const updatedBudgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    expect(updatedBudgetRequest[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});