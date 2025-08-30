import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type FileUpload } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getFileUploads = async (budgetRequestId: number): Promise<FileUpload[]> => {
  try {
    // Query the database for file uploads with the given budget_request_id
    const results = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.budget_request_id, budgetRequestId))
      .orderBy(desc(fileUploadsTable.uploaded_at))
      .execute();

    // Return the file uploads - no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Get file uploads failed:', error);
    throw error;
  }
};