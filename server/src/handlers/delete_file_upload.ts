import { db } from '../db';
import { fileUploadsTable, budgetRequestsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

export const deleteFileUpload = async (id: number): Promise<boolean> => {
  try {
    // 1. Check if the file upload exists and get the file path and budget request info
    const fileUploadResult = await db
      .select({
        id: fileUploadsTable.id,
        file_path: fileUploadsTable.file_path,
        budget_request_id: fileUploadsTable.budget_request_id,
        status: budgetRequestsTable.status
      })
      .from(fileUploadsTable)
      .innerJoin(budgetRequestsTable, eq(fileUploadsTable.budget_request_id, budgetRequestsTable.id))
      .where(eq(fileUploadsTable.id, id))
      .execute();

    if (fileUploadResult.length === 0) {
      return false; // File upload not found
    }

    const fileUpload = fileUploadResult[0];

    // Check if the parent budget request is in an editable state
    const editableStatuses = ['draft', 'revision_requested'];
    if (!editableStatuses.includes(fileUpload.status)) {
      return false; // Budget request is not editable
    }

    // 2. Try to delete the physical file from storage (if it exists)
    let fileDeleted = false;
    try {
      if (existsSync(fileUpload.file_path)) {
        await unlink(fileUpload.file_path);
        fileDeleted = true;
      } else {
        // File doesn't exist on disk, but we'll still clean up the database record
        fileDeleted = true;
      }
    } catch (error) {
      console.error('Failed to delete physical file:', error);
      // Continue to delete database record even if file deletion fails
      fileDeleted = true;
    }

    // 3. Delete the file upload record from the database
    const deleteResult = await db
      .delete(fileUploadsTable)
      .where(eq(fileUploadsTable.id, id))
      .execute();

    // 4. Return true if deletion was successful
    return (deleteResult.rowCount ?? 0) > 0 && fileDeleted;

  } catch (error) {
    console.error('File upload deletion failed:', error);
    throw error;
  }
};