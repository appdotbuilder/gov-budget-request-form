import { db } from '../db';
import { budgetItemsTable, budgetRequestsTable } from '../db/schema';
import { type UpdateBudgetItemInput, type BudgetItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateBudgetItem = async (input: UpdateBudgetItemInput): Promise<BudgetItem> => {
  try {
    // First, check if the budget item exists
    const existingItem = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.id, input.id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error(`Budget item with id ${input.id} not found`);
    }

    const currentItem = existingItem[0];

    // Check if the parent budget request is in an editable state
    const budgetRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, currentItem.budget_request_id))
      .execute();

    if (budgetRequest.length === 0) {
      throw new Error(`Budget request with id ${currentItem.budget_request_id} not found`);
    }

    const requestStatus = budgetRequest[0].status;
    if (requestStatus === 'approved' || requestStatus === 'rejected') {
      throw new Error(`Cannot update budget item - budget request is ${requestStatus}`);
    }

    // Prepare update data with only provided fields
    const updateData: Record<string, any> = {};
    
    if (input.category !== undefined) updateData['category'] = input.category;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.unit !== undefined) updateData['unit'] = input.unit;
    if (input.quantity !== undefined) updateData['quantity'] = input.quantity;
    if (input.unit_cost !== undefined) updateData['unit_cost'] = input.unit_cost.toString();
    if (input.total_cost !== undefined) updateData['total_cost'] = input.total_cost.toString();
    if (input.justification !== undefined) updateData['justification'] = input.justification;

    // Recalculate total_cost if unit_cost or quantity changed
    if ((input.unit_cost !== undefined || input.quantity !== undefined) && input.total_cost === undefined) {
      const newUnitCost = input.unit_cost !== undefined ? input.unit_cost : parseFloat(currentItem.unit_cost);
      let newQuantity: number;
      
      if (input.quantity !== undefined) {
        newQuantity = input.quantity !== null ? input.quantity : 1;
      } else {
        newQuantity = currentItem.quantity !== null ? currentItem.quantity : 1;
      }
      
      updateData['total_cost'] = (newUnitCost * newQuantity).toString();
    }

    // Update the budget item
    const result = await db.update(budgetItemsTable)
      .set(updateData)
      .where(eq(budgetItemsTable.id, input.id))
      .returning()
      .execute();

    const updatedItem = result[0];

    // Recalculate the total amount for the parent budget request
    const allItems = await db.select()
      .from(budgetItemsTable)
      .where(eq(budgetItemsTable.budget_request_id, currentItem.budget_request_id))
      .execute();

    const newTotalAmount = allItems.reduce((sum, item) => sum + parseFloat(item.total_cost), 0);

    // Update the parent budget request's total amount
    await db.update(budgetRequestsTable)
      .set({ 
        total_amount: newTotalAmount.toString(),
        updated_at: new Date()
      })
      .where(eq(budgetRequestsTable.id, currentItem.budget_request_id))
      .execute();

    // Return the updated item with numeric conversions
    return {
      ...updatedItem,
      unit_cost: parseFloat(updatedItem.unit_cost),
      total_cost: parseFloat(updatedItem.total_cost)
    };
  } catch (error) {
    console.error('Budget item update failed:', error);
    throw error;
  }
};