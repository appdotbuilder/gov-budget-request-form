import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, budgetItemsTable } from '../db/schema';
import { type UpdateBudgetItemInput, type CreateBudgetRequestInput, type CreateBudgetItemInput } from '../schema';
import { updateBudgetItem } from '../handlers/update_budget_item';
import { eq } from 'drizzle-orm';

// Helper function to create a budget request
const createTestBudgetRequest = async (): Promise<number> => {
  const requestInput: CreateBudgetRequestInput = {
    department_name: 'Test Department',
    department_code: 'TD001',
    contact_person: 'John Doe',
    contact_email: 'john@example.com',
    contact_phone: '555-0123',
    fiscal_year: 2024,
    request_title: 'Test Budget Request',
    request_description: 'A test budget request for testing purposes',
    total_amount: 1000.00,
    priority_level: 'medium',
    justification: 'This is a test justification that meets the minimum length requirement',
    expected_outcomes: 'Expected test outcomes',
    timeline_start: new Date('2024-01-01'),
    timeline_end: new Date('2024-12-31'),
    status: 'draft'
  };

  const result = await db.insert(budgetRequestsTable)
    .values({
      ...requestInput,
      total_amount: requestInput.total_amount.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

// Helper function to create a budget item
const createTestBudgetItem = async (budgetRequestId: number): Promise<number> => {
  const itemInput: CreateBudgetItemInput = {
    budget_request_id: budgetRequestId,
    category: 'operational',
    description: 'Test Budget Item',
    unit: 'pieces',
    quantity: 10,
    unit_cost: 50.00,
    total_cost: 500.00,
    justification: 'Test item justification'
  };

  const result = await db.insert(budgetItemsTable)
    .values({
      ...itemInput,
      unit_cost: itemInput.unit_cost.toString(),
      total_cost: itemInput.total_cost.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateBudgetItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a budget item with all fields', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      category: 'personnel',
      description: 'Updated Budget Item',
      unit: 'hours',
      quantity: 20,
      unit_cost: 75.00,
      total_cost: 1500.00,
      justification: 'Updated justification'
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.id).toEqual(budgetItemId);
    expect(result.category).toEqual('personnel');
    expect(result.description).toEqual('Updated Budget Item');
    expect(result.unit).toEqual('hours');
    expect(result.quantity).toEqual(20);
    expect(result.unit_cost).toEqual(75.00);
    expect(result.total_cost).toEqual(1500.00);
    expect(result.justification).toEqual('Updated justification');
    expect(typeof result.unit_cost).toEqual('number');
    expect(typeof result.total_cost).toEqual('number');
  });

  it('should update only provided fields', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'Partially Updated Item',
      unit_cost: 60.00
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.description).toEqual('Partially Updated Item');
    expect(result.unit_cost).toEqual(60.00);
    expect(result.category).toEqual('operational'); // Should remain unchanged
    expect(result.unit).toEqual('pieces'); // Should remain unchanged
    expect(result.quantity).toEqual(10); // Should remain unchanged
  });

  it('should recalculate total_cost when unit_cost or quantity changes', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      unit_cost: 80.00,
      quantity: 15
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.unit_cost).toEqual(80.00);
    expect(result.quantity).toEqual(15);
    expect(result.total_cost).toEqual(1200.00); // 80 * 15
  });

  it('should recalculate total_cost when only unit_cost changes', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      unit_cost: 25.00
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.unit_cost).toEqual(25.00);
    expect(result.quantity).toEqual(10); // Original quantity
    expect(result.total_cost).toEqual(250.00); // 25 * 10
  });

  it('should recalculate total_cost when only quantity changes', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      quantity: 5
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.unit_cost).toEqual(50.00); // Original unit cost
    expect(result.quantity).toEqual(5);
    expect(result.total_cost).toEqual(250.00); // 50 * 5
  });

  it('should use explicit total_cost when provided along with unit_cost/quantity', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      unit_cost: 100.00,
      quantity: 8,
      total_cost: 900.00 // Explicit total (not 100 * 8 = 800)
    };

    const result = await updateBudgetItem(updateInput);

    expect(result.unit_cost).toEqual(100.00);
    expect(result.quantity).toEqual(8);
    expect(result.total_cost).toEqual(900.00); // Should use explicit value
  });

  it('should update parent budget request total amount', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId1 = await createTestBudgetItem(budgetRequestId);
    const budgetItemId2 = await createTestBudgetItem(budgetRequestId);

    // Initial total should be 500 + 500 = 1000
    const initialRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();
    expect(parseFloat(initialRequest[0].total_amount)).toEqual(1000.00);

    // Update first item to change total_cost
    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId1,
      total_cost: 750.00
    };

    await updateBudgetItem(updateInput);

    // Check that parent budget request total is updated
    const updatedRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();
    
    expect(parseFloat(updatedRequest[0].total_amount)).toEqual(1250.00); // 750 + 500
  });

  it('should save updates to database', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'Database Test Item',
      unit_cost: 99.99
    };

    await updateBudgetItem(updateInput);

    // Verify the changes are saved in the database
    const savedItem = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, budgetItemId))
      .execute();

    expect(savedItem).toHaveLength(1);
    expect(savedItem[0].description).toEqual('Database Test Item');
    expect(parseFloat(savedItem[0].unit_cost)).toEqual(99.99);
  });

  it('should throw error when budget item does not exist', async () => {
    const updateInput: UpdateBudgetItemInput = {
      id: 99999, // Non-existent ID
      description: 'This should fail'
    };

    expect(updateBudgetItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when parent budget request is approved', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    // Update budget request status to approved
    await db.update(budgetRequestsTable)
      .set({ status: 'approved' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'This should fail'
    };

    expect(updateBudgetItem(updateInput)).rejects.toThrow(/approved/i);
  });

  it('should throw error when parent budget request is rejected', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    // Update budget request status to rejected
    await db.update(budgetRequestsTable)
      .set({ status: 'rejected' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'This should fail'
    };

    expect(updateBudgetItem(updateInput)).rejects.toThrow(/rejected/i);
  });

  it('should allow updates when budget request is in draft status', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'Draft status update'
    };

    const result = await updateBudgetItem(updateInput);
    expect(result.description).toEqual('Draft status update');
  });

  it('should allow updates when budget request is submitted', async () => {
    const budgetRequestId = await createTestBudgetRequest();
    const budgetItemId = await createTestBudgetItem(budgetRequestId);

    // Update budget request status to submitted
    await db.update(budgetRequestsTable)
      .set({ status: 'submitted' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const updateInput: UpdateBudgetItemInput = {
      id: budgetItemId,
      description: 'Submitted status update'
    };

    const result = await updateBudgetItem(updateInput);
    expect(result.description).toEqual('Submitted status update');
  });
});