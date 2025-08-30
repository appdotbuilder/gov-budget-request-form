import { db } from '../db';
import { fileUploadsTable, budgetRequestsTable } from '../db/schema';
import { type CreateFileUploadInput, type FileUpload } from '../schema';
import { eq } from 'drizzle-orm';

export const uploadFile = async (input: CreateFileUploadInput): Promise<FileUpload> => {
  try {
    // 1. Check if the associated budget request exists
    const budgetRequests = await db.select()
      .from(budgetRequestsTable)
      .where(eq(budgetRequestsTable.id, input.budget_request_id))
      .execute();

    if (budgetRequests.length === 0) {
      throw new Error(`Budget request with ID ${input.budget_request_id} not found`);
    }

    const budgetRequest = budgetRequests[0];

    // 2. Check if the budget request is in an editable state
    const editableStatuses = ['draft', 'revision_requested'];
    if (!editableStatuses.includes(budgetRequest.status)) {
      throw new Error(`Cannot upload files to budget request with status: ${budgetRequest.status}`);
    }

    // 3. Validate file constraints (basic validation)
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    if (input.file_size > maxFileSize) {
      throw new Error(`File size ${input.file_size} bytes exceeds maximum allowed size of ${maxFileSize} bytes`);
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedMimeTypes.includes(input.mime_type)) {
      throw new Error(`File type ${input.mime_type} is not allowed`);
    }

    // 4. Insert the file upload record into the database
    const result = await db.insert(fileUploadsTable)
      .values({
        budget_request_id: input.budget_request_id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type
      })
      .returning()
      .execute();

    // 5. Return the created file upload record
    const fileUpload = result[0];
    return fileUpload;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};