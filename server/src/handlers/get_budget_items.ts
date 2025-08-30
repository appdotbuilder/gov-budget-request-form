import { db } from '../db';
import { budgetItemsTable } from '../db/schema';
import { type BudgetItem } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getBudgetItems = async (budgetRequestId: number): Promise<BudgetItem[]> => {
  try {
    // Query budget items for the specific budget request, ordered by category then creation date
    const results = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.budget_request_id, budgetRequestId))
      .orderBy(asc(budgetItemsTable.category), asc(budgetItemsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      unit_cost: parseFloat(item.unit_cost),
      total_cost: parseFloat(item.total_cost)
    }));
  } catch (error) {
    console.error('Failed to fetch budget items:', error);
    throw error;
  }
};