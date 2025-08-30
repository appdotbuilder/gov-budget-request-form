import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type BudgetRequest } from '../schema';
import { eq } from 'drizzle-orm';

export const getBudgetRequestById = async (id: number): Promise<BudgetRequest | null> => {
  try {
    // Query the database for the budget request with the given ID
    const results = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const budgetRequest = results[0];
    return {
      ...budgetRequest,
      total_amount: parseFloat(budgetRequest.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to fetch budget request by ID:', error);
    throw error;
  }
};