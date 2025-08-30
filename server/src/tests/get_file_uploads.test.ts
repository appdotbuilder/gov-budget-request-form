import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, fileUploadsTable } from '../db/schema';
import { type CreateBudgetRequestInput, type CreateFileUploadInput } from '../schema';
import { getFileUploads } from '../handlers/get_file_uploads';

// Test input for creating a budget request
const testBudgetRequestInput: CreateBudgetRequestInput = {
  department_name: 'Test Department',
  department_code: 'TEST001',
  contact_person: 'John Doe',
  contact_email: 'john.doe@example.com',
  contact_phone: '+1-555-0123',
  fiscal_year: 2024,
  request_title: 'Test Budget Request',
  request_description: 'This is a test budget request for file upload testing',
  total_amount: 50000.00,
  priority_level: 'medium',
  justification: 'This is a detailed justification for the budget request',
  expected_outcomes: 'Expected outcomes from this budget request',
  timeline_start: new Date('2024-01-01'),
  timeline_end: new Date('2024-12-31'),
  status: 'draft'
};

// Test inputs for file uploads
const testFileUpload1: CreateFileUploadInput = {
  budget_request_id: 1, // Will be set dynamically in tests
  filename: 'budget_details_2024.xlsx',
  original_filename: 'Budget Details 2024.xlsx',
  file_path: '/uploads/budget_details_2024.xlsx',
  file_size: 1024000,
  mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const testFileUpload2: CreateFileUploadInput = {
  budget_request_id: 1, // Will be set dynamically in tests
  filename: 'supporting_docs.pdf',
  original_filename: 'Supporting Documents.pdf',
  file_path: '/uploads/supporting_docs.pdf',
  file_size: 512000,
  mime_type: 'application/pdf'
};

const testFileUpload3: CreateFileUploadInput = {
  budget_request_id: 1, // Will be set dynamically in tests
  filename: 'project_timeline.docx',
  original_filename: 'Project Timeline.docx',
  file_path: '/uploads/project_timeline.docx',
  file_size: 256000,
  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

describe('getFileUploads', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when budget request has no file uploads', async () => {
    // Create a budget request without any file uploads
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    const result = await getFileUploads(budgetRequestId);

    expect(result).toEqual([]);
  });

  it('should return empty array when budget request does not exist', async () => {
    const nonExistentId = 9999;

    const result = await getFileUploads(nonExistentId);

    expect(result).toEqual([]);
  });

  it('should return single file upload for budget request', async () => {
    // Create a budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create a file upload for the budget request
    await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload1,
        budget_request_id: budgetRequestId
      })
      .execute();

    const result = await getFileUploads(budgetRequestId);

    expect(result).toHaveLength(1);
    expect(result[0].budget_request_id).toBe(budgetRequestId);
    expect(result[0].filename).toBe('budget_details_2024.xlsx');
    expect(result[0].original_filename).toBe('Budget Details 2024.xlsx');
    expect(result[0].file_path).toBe('/uploads/budget_details_2024.xlsx');
    expect(result[0].file_size).toBe(1024000);
    expect(result[0].mime_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result[0].uploaded_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should return multiple file uploads ordered by upload date (newest first)', async () => {
    // Create a budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create multiple file uploads with slight time delays to ensure different timestamps
    const upload1Result = await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload1,
        budget_request_id: budgetRequestId
      })
      .returning()
      .execute();

    // Wait a small amount to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const upload2Result = await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload2,
        budget_request_id: budgetRequestId
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const upload3Result = await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload3,
        budget_request_id: budgetRequestId
      })
      .returning()
      .execute();

    const result = await getFileUploads(budgetRequestId);

    expect(result).toHaveLength(3);
    
    // Verify ordering - newest first (descending by uploaded_at)
    expect(result[0].uploaded_at >= result[1].uploaded_at).toBe(true);
    expect(result[1].uploaded_at >= result[2].uploaded_at).toBe(true);
    
    // Verify all files are returned with correct data
    const filenames = result.map(upload => upload.filename);
    expect(filenames).toContain('budget_details_2024.xlsx');
    expect(filenames).toContain('supporting_docs.pdf');
    expect(filenames).toContain('project_timeline.docx');

    // Verify all uploads belong to the correct budget request
    result.forEach(upload => {
      expect(upload.budget_request_id).toBe(budgetRequestId);
      expect(upload.id).toBeDefined();
      expect(upload.uploaded_at).toBeInstanceOf(Date);
    });
  });

  it('should only return file uploads for the specified budget request', async () => {
    // Create two budget requests
    const budgetRequest1Result = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString(),
        request_title: 'First Budget Request'
      })
      .returning()
      .execute();

    const budgetRequest2Result = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString(),
        request_title: 'Second Budget Request',
        department_name: 'Another Department'
      })
      .returning()
      .execute();

    const budgetRequest1Id = budgetRequest1Result[0].id;
    const budgetRequest2Id = budgetRequest2Result[0].id;

    // Create file uploads for both budget requests
    await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload1,
        budget_request_id: budgetRequest1Id
      })
      .execute();

    await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload2,
        budget_request_id: budgetRequest1Id
      })
      .execute();

    await db.insert(fileUploadsTable)
      .values({
        ...testFileUpload3,
        budget_request_id: budgetRequest2Id
      })
      .execute();

    // Get file uploads for the first budget request
    const result1 = await getFileUploads(budgetRequest1Id);
    expect(result1).toHaveLength(2);
    result1.forEach(upload => {
      expect(upload.budget_request_id).toBe(budgetRequest1Id);
    });

    // Get file uploads for the second budget request
    const result2 = await getFileUploads(budgetRequest2Id);
    expect(result2).toHaveLength(1);
    expect(result2[0].budget_request_id).toBe(budgetRequest2Id);
    expect(result2[0].filename).toBe('project_timeline.docx');
  });

  it('should handle various file types correctly', async () => {
    // Create a budget request
    const budgetRequestResult = await db.insert(budgetRequestsTable)
      .values({
        ...testBudgetRequestInput,
        total_amount: testBudgetRequestInput.total_amount.toString()
      })
      .returning()
      .execute();

    const budgetRequestId = budgetRequestResult[0].id;

    // Create file uploads with different file types
    const fileUploads = [
      {
        ...testFileUpload1,
        budget_request_id: budgetRequestId,
        filename: 'spreadsheet.xlsx',
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      {
        ...testFileUpload2,
        budget_request_id: budgetRequestId,
        filename: 'document.pdf',
        mime_type: 'application/pdf'
      },
      {
        ...testFileUpload3,
        budget_request_id: budgetRequestId,
        filename: 'image.png',
        mime_type: 'image/png',
        file_size: 102400
      }
    ];

    // Insert all file uploads
    for (const upload of fileUploads) {
      await db.insert(fileUploadsTable).values(upload).execute();
    }

    const result = await getFileUploads(budgetRequestId);

    expect(result).toHaveLength(3);
    
    // Verify different MIME types are handled correctly
    const mimeTypes = result.map(upload => upload.mime_type);
    expect(mimeTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(mimeTypes).toContain('application/pdf');
    expect(mimeTypes).toContain('image/png');

    // Verify all uploads have the required fields
    result.forEach(upload => {
      expect(upload.id).toBeDefined();
      expect(upload.budget_request_id).toBe(budgetRequestId);
      expect(upload.filename).toBeDefined();
      expect(upload.original_filename).toBeDefined();
      expect(upload.file_path).toBeDefined();
      expect(typeof upload.file_size).toBe('number');
      expect(upload.mime_type).toBeDefined();
      expect(upload.uploaded_at).toBeInstanceOf(Date);
    });
  });
});