import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type CreateBudgetRequestInput, type BudgetRequest } from '../schema';

export const createBudgetRequest = async (input: CreateBudgetRequestInput): Promise<BudgetRequest> => {
  try {
    // Insert budget request record
    const result = await db.insert(budgetRequestsTable)
      .values({
        department_name: input.department_name,
        department_code: input.department_code,
        contact_person: input.contact_person,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        fiscal_year: input.fiscal_year,
        request_title: input.request_title,
        request_description: input.request_description,
        total_amount: input.total_amount.toString(), // Convert number to string for numeric column
        priority_level: input.priority_level,
        justification: input.justification,
        expected_outcomes: input.expected_outcomes,
        timeline_start: input.timeline_start,
        timeline_end: input.timeline_end,
        status: input.status // Uses 'draft' default from Zod schema
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const budgetRequest = result[0];
    return {
      ...budgetRequest,
      total_amount: parseFloat(budgetRequest.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget request creation failed:', error);
    throw error;
  }
};