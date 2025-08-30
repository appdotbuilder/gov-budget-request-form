import { db } from '../db';
import { budgetItemsTable, budgetRequestsTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const deleteBudgetItem = async (id: number): Promise<boolean> => {
  try {
    // First, get the budget item to check if it exists and get the budget request ID
    const budgetItem = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, id))
      .execute();

    if (budgetItem.length === 0) {
      // Item doesn't exist, return false
      return false;
    }

    const item = budgetItem[0];

    // Check if the parent budget request is editable (draft or revision_requested)
    const budgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, item.budget_request_id))
      .execute();

    if (budgetRequest.length === 0) {
      // Parent budget request doesn't exist, return false
      return false;
    }

    const request = budgetRequest[0];
    const editableStatuses = ['draft', 'revision_requested'];
    
    if (!editableStatuses.includes(request.status)) {
      // Budget request is not in an editable state, return false
      return false;
    }

    // Delete the budget item
    const deleteResult = await db.delete(budgetItemsTable)
      .where(eq(budgetItemsTable.id, id))
      .execute();

    // Check if deletion was successful
    if (deleteResult.rowCount === 0) {
      return false;
    }

    // Recalculate and update the total_amount of the parent budget request
    const remainingItems = await db.select({
      total: sql<string>`COALESCE(SUM(${budgetItemsTable.total_cost}), 0)`
    })
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.budget_request_id, item.budget_request_id))
      .execute();

    const newTotalAmount = parseFloat(remainingItems[0].total);

    // Update the parent budget request's total_amount and updated_at
    await db.update(budgetRequestsTable)
      .set({ 
        total_amount: newTotalAmount.toString(),
        updated_at: new Date()
      })
      .where(eq(budgetRequestsTable.id, item.budget_request_id))
      .execute();

    return true;
  } catch (error) {
    console.error('Budget item deletion failed:', error);
    throw error;
  }
};