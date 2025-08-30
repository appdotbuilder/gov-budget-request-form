import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, fileUploadsTable } from '../db/schema';
import { type CreateFileUploadInput, type CreateBudgetRequestInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';

// Test budget request data
const testBudgetRequest: CreateBudgetRequestInput = {
  department_name: 'IT Department',
  department_code: 'IT001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@company.com',
  contact_phone: '+1234567890',
  fiscal_year: 2024,
  request_title: 'Software Licenses',
  request_description: 'Purchase software licenses for development team',
  total_amount: 25000.00,
  priority_level: 'high',
  justification: 'Critical software licenses needed for ongoing projects',
  expected_outcomes: 'Improved development efficiency and compliance',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-12-31'),
  status: 'draft'
};

// Test file upload input
const testFileUpload: CreateFileUploadInput = {
  budget_request_id: 1, // Will be updated after creating budget request
  filename: 'budget-details-20241201.xlsx',
  original_filename: 'Software Budget Details.xlsx',
  file_path: '/uploads/budget-requests/1/budget-details-20241201.xlsx',
  file_size: 2048576, // 2MB
  mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

describe('uploadFile', () => {
  let budgetRequestId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test budget request
    const budgetResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequest,
        total_amount: testBudgetRequest.total_amount.toString()
      })
      .returning()
      .execute();
    
    budgetRequestId = budgetResult[0].id;
  });

  afterEach(resetDB);

  it('should upload file successfully for draft budget request', async () => {
    const input = { ...testFileUpload, budget_request_id: budgetRequestId };
    
    const result = await uploadFile(input);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.budget_request_id).toBe(budgetRequestId);
    expect(result.filename).toBe('budget-details-20241201.xlsx');
    expect(result.original_filename).toBe('Software Budget Details.xlsx');
    expect(result.file_path).toBe('/uploads/budget-requests/1/budget-details-20241201.xlsx');
    expect(result.file_size).toBe(2048576);
    expect(result.mime_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save file upload record to database', async () => {
    const input = { ...testFileUpload, budget_request_id: budgetRequestId };
    
    const result = await uploadFile(input);

    // Query database to verify record was saved
    const fileUploads = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, result.id))
      .execute();

    expect(fileUploads).toHaveLength(1);
    expect(fileUploads[0].budget_request_id).toBe(budgetRequestId);
    expect(fileUploads[0].filename).toBe('budget-details-20241201.xlsx');
    expect(fileUploads[0].original_filename).toBe('Software Budget Details.xlsx');
    expect(fileUploads[0].file_size).toBe(2048576);
    expect(fileUploads[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should allow file upload for revision_requested status', async () => {
    // Update budget request to revision_requested status
    await db.update(budgetRequestsTable)
      .set({ status: 'revision_requested' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testFileUpload, budget_request_id: budgetRequestId };
    
    const result = await uploadFile(input);

    expect(result.id).toBeDefined();
    expect(result.budget_request_id).toBe(budgetRequestId);
  });

  it('should reject file upload for non-editable budget request status', async () => {
    // Update budget request to submitted status (not editable)
    await db.update(budgetRequestsTable)
      .set({ status: 'submitted' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testFileUpload, budget_request_id: budgetRequestId };
    
    await expect(uploadFile(input)).rejects.toThrow(/Cannot upload files to budget request with status: submitted/i);
  });

  it('should reject file upload for approved budget request', async () => {
    // Update budget request to approved status
    await db.update(budgetRequestsTable)
      .set({ status: 'approved' })
      .where(eq(budgetRequestsTable.id, budgetRequestId))
      .execute();

    const input = { ...testFileUpload, budget_request_id: budgetRequestId };
    
    await expect(uploadFile(input)).rejects.toThrow(/Cannot upload files to budget request with status: approved/i);
  });

  it('should reject file upload for non-existent budget request', async () => {
    const input = { ...testFileUpload, budget_request_id: 99999 };
    
    await expect(uploadFile(input)).rejects.toThrow(/Budget request with ID 99999 not found/i);
  });

  it('should reject file that exceeds size limit', async () => {
    const input = { 
      ...testFileUpload, 
      budget_request_id: budgetRequestId,
      file_size: 60 * 1024 * 1024 // 60MB - exceeds 50MB limit
    };
    
    await expect(uploadFile(input)).rejects.toThrow(/File size .* bytes exceeds maximum allowed size/i);
  });

  it('should reject file with unsupported MIME type', async () => {
    const input = { 
      ...testFileUpload, 
      budget_request_id: budgetRequestId,
      mime_type: 'application/x-executable'
    };
    
    await expect(uploadFile(input)).rejects.toThrow(/File type .* is not allowed/i);
  });

  it('should accept various allowed MIME types', async () => {
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

    for (const mimeType of allowedMimeTypes) {
      const input = { 
        ...testFileUpload, 
        budget_request_id: budgetRequestId,
        mime_type: mimeType,
        filename: `test-file-${mimeType.replace(/[\/\-]/g, '_')}.ext`
      };
      
      const result = await uploadFile(input);
      expect(result.id).toBeDefined();
      expect(result.mime_type).toBe(mimeType);
    }
  });

  it('should handle multiple file uploads to same budget request', async () => {
    const input1 = { 
      ...testFileUpload, 
      budget_request_id: budgetRequestId,
      filename: 'file1.pdf',
      original_filename: 'First File.pdf',
      mime_type: 'application/pdf'
    };
    
    const input2 = { 
      ...testFileUpload, 
      budget_request_id: budgetRequestId,
      filename: 'file2.xlsx',
      original_filename: 'Second File.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const result1 = await uploadFile(input1);
    const result2 = await uploadFile(input2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toBe(result2.id);
    
    // Verify both files are in database
    const fileUploads = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.budget_request_id, budgetRequestId))
      .execute();

    expect(fileUploads).toHaveLength(2);
  });

  it('should handle file upload with minimal file size', async () => {
    const input = { 
      ...testFileUpload, 
      budget_request_id: budgetRequestId,
      file_size: 1 // 1 byte
    };
    
    const result = await uploadFile(input);

    expect(result.id).toBeDefined();
    expect(result.file_size).toBe(1);
  });
});