import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type UpdateBudgetRequestInput, type BudgetRequest } from '../schema';
import { eq } from 'drizzle-orm';

export const updateBudgetRequest = async (input: UpdateBudgetRequestInput): Promise<BudgetRequest> => {
  try {
    // Check if the budget request exists
    const existingRequest = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, input.id))
      .execute();

    if (existingRequest.length === 0) {
      throw new Error(`Budget request with ID ${input.id} not found`);
    }

    // Prepare update data - only include fields that are provided
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    // Add only the fields that are provided in the input
    if (input.department_name !== undefined) updateData['department_name'] = input.department_name;
    if (input.department_code !== undefined) updateData['department_code'] = input.department_code;
    if (input.contact_person !== undefined) updateData['contact_person'] = input.contact_person;
    if (input.contact_email !== undefined) updateData['contact_email'] = input.contact_email;
    if (input.contact_phone !== undefined) updateData['contact_phone'] = input.contact_phone;
    if (input.fiscal_year !== undefined) updateData['fiscal_year'] = input.fiscal_year;
    if (input.request_title !== undefined) updateData['request_title'] = input.request_title;
    if (input.request_description !== undefined) updateData['request_description'] = input.request_description;
    if (input.total_amount !== undefined) updateData['total_amount'] = input.total_amount.toString(); // Convert to string for numeric column
    if (input.priority_level !== undefined) updateData['priority_level'] = input.priority_level;
    if (input.justification !== undefined) updateData['justification'] = input.justification;
    if (input.expected_outcomes !== undefined) updateData['expected_outcomes'] = input.expected_outcomes;
    if (input.timeline_start !== undefined) updateData['timeline_start'] = input.timeline_start;
    if (input.timeline_end !== undefined) updateData['timeline_end'] = input.timeline_end;
    if (input.status !== undefined) updateData['status'] = input.status;
    if (input.reviewer_notes !== undefined) updateData['reviewer_notes'] = input.reviewer_notes;

    // Update the budget request
    const result = await db.update(budgetRequestsTable)
      .set(updateData)
      .where(eq(budgetRequestsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedRequest = result[0];
    return {
      ...updatedRequest,
      total_amount: parseFloat(updatedRequest.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget request update failed:', error);
    throw error;
  }
};