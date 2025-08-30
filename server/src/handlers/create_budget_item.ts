import { db } from '../db';
import { budgetItemsTable, budgetRequestsTable } from '../db/schema';
import { type CreateBudgetItemInput, type BudgetItem } from '../schema';
import { eq } from 'drizzle-orm';

export const createBudgetItem = async (input: CreateBudgetItemInput): Promise<BudgetItem> => {
  try {
    // First, verify the budget request exists and is editable (not approved/rejected)
    const budgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, input.budget_request_id))
      .execute();

    if (budgetRequest.length === 0) {
      throw new Error(`Budget request with id ${input.budget_request_id} not found`);
    }

    const request = budgetRequest[0];
    if (request.status === 'approved' || request.status === 'rejected') {
      throw new Error(`Cannot add budget items to a ${request.status} budget request`);
    }

    // Insert the budget item
    const result = await db.insert(budgetItemsTable)
      .values({
        budget_request_id: input.budget_request_id,
        category: input.category,
        description: input.description,
        unit: input.unit,
        quantity: input.quantity,
        unit_cost: input.unit_cost.toString(), // Convert number to string for numeric column
        total_cost: input.total_cost.toString(), // Convert number to string for numeric column
        justification: input.justification
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const budgetItem = result[0];
    return {
      ...budgetItem,
      unit_cost: parseFloat(budgetItem.unit_cost), // Convert string back to number
      total_cost: parseFloat(budgetItem.total_cost) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget item creation failed:', error);
    throw error;
  }
};