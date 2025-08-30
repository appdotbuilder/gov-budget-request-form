import { db } from '../db';
import { budgetRequestsTable } from '../db/schema';
import { type GetBudgetRequestsQuery, type PaginatedBudgetRequests } from '../schema';
import { eq, and, count, SQL, desc } from 'drizzle-orm';

export const getBudgetRequests = async (query: GetBudgetRequestsQuery): Promise<PaginatedBudgetRequests> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query.department_name) {
      conditions.push(eq(budgetRequestsTable.department_name, query.department_name));
    }

    if (query.fiscal_year !== undefined) {
      conditions.push(eq(budgetRequestsTable.fiscal_year, query.fiscal_year));
    }

    if (query.status) {
      conditions.push(eq(budgetRequestsTable.status, query.status));
    }

    if (query.priority_level) {
      conditions.push(eq(budgetRequestsTable.priority_level, query.priority_level));
    }

    // Build where clause
    const whereClause = conditions.length === 0 ? undefined : 
      (conditions.length === 1 ? conditions[0] : and(...conditions));

    // Execute data query
    const budgetRequests = await (() => {
      const baseQuery = db.select().from(budgetRequestsTable);
      const queryWithWhere = whereClause ? baseQuery.where(whereClause) : baseQuery;
      return queryWithWhere
        .orderBy(desc(budgetRequestsTable.created_at))
        .limit(query.limit)
        .offset(query.offset)
        .execute();
    })();

    // Execute count query
    const totalResult = await (() => {
      const baseCountQuery = db.select({ count: count() }).from(budgetRequestsTable);
      return whereClause ? baseCountQuery.where(whereClause).execute() : baseCountQuery.execute();
    })();

    const total = totalResult[0].count;

    // Convert numeric fields back to numbers
    const data = budgetRequests.map(request => ({
      ...request,
      total_amount: parseFloat(request.total_amount)
    }));

    return {
      data,
      total,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + query.limit < total
    };
  } catch (error) {
    console.error('Failed to fetch budget requests:', error);
    throw error;
  }
};