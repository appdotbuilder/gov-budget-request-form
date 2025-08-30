import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type BudgetRequest } from '../schema';
import { eq } from 'drizzle-orm';

export const submitBudgetRequest = async (id: number): Promise<BudgetRequest> => {
  try {
    // First, check if the budget request exists and get its current data
    const existingRequests = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, id))
      .execute();

    if (existingRequests.length === 0) {
      throw new Error(`Budget request with id ${id} not found`);
    }

    const existingRequest = existingRequests[0];

    // Check if the request is in draft status (only draft requests can be submitted)
    if (existingRequest.status !== 'draft') {
      throw new Error(`Budget request with id ${id} is not in draft status. Current status: ${existingRequest.status}`);
    }

    // Validate that all required fields are complete for submission
    const requiredFields = {
      department_name: existingRequest.department_name,
      contact_person: existingRequest.contact_person,
      contact_email: existingRequest.contact_email,
      request_title: existingRequest.request_title,
      request_description: existingRequest.request_description,
      total_amount: existingRequest.total_amount,
      justification: existingRequest.justification,
      expected_outcomes: existingRequest.expected_outcomes
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || (typeof value === 'string' && value.trim().length === 0))
      .map(([key, _]) => key);

    if (missingFields.length > 0) {
      throw new Error(`Cannot submit budget request. Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate total_amount is positive
    const totalAmount = parseFloat(existingRequest.total_amount);
    if (totalAmount <= 0) {
      throw new Error('Cannot submit budget request. Total amount must be greater than 0');
    }

    // Update the status to 'submitted' and set submitted_at timestamp
    const result = await db.update(budgetRequestsTable)
      .set({
        status: 'submitted',
        submitted_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(budgetRequestsTable.id, id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedRequest = result[0];
    return {
      ...updatedRequest,
      total_amount: parseFloat(updatedRequest.total_amount)
    };
  } catch (error) {
    console.error('Budget request submission failed:', error);
    throw error;
  }
};