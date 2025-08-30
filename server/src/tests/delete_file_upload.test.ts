import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetRequestsTable, fileUploadsTable } from '../db/schema';
import { deleteFileUpload } from '../handlers/delete_file_upload';
import { eq } from 'drizzle-orm';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('deleteFileUpload', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test budget request
  const createTestBudgetRequest = async (status = 'draft') => {
    const result = await db.insert(budgetRequestsTable)
      .values({
        department_name: 'Test Department',
        contact_person: 'John Doe',
        contact_email: 'john@example.com',
        fiscal_year: 2024,
        request_title: 'Test Request',
        request_description: 'A test budget request',
        total_amount: '10000.00',
        priority_level: 'medium',
        justification: 'This is a test justification for the budget request',
        expected_outcomes: 'Expected test outcomes',
        status: status as any
      })
      .returning()
      .execute();

    return result[0];
  };

  // Helper function to create test file upload with physical file
  const createTestFileUpload = async (budgetRequestId: number, createPhysicalFile = true) => {
    const testDir = join(tmpdir(), 'test-uploads');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const testFilePath = join(testDir, `test-file-${Date.now()}.txt`);
    
    if (createPhysicalFile) {
      writeFileSync(testFilePath, 'Test file content');
    }

    const result = await db.insert(fileUploadsTable)
      .values({
        budget_request_id: budgetRequestId,
        filename: 'test-file.txt',
        original_filename: 'test-file-original.txt',
        file_path: testFilePath,
        file_size: 17,
        mime_type: 'text/plain'
      })
      .returning()
      .execute();

    return { fileUpload: result[0], filePath: testFilePath };
  };

  // Cleanup helper
  const cleanupFile = (filePath: string) => {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  it('should successfully delete file upload and physical file', async () => {
    const budgetRequest = await createTestBudgetRequest('draft');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, true);

    // Verify file exists before deletion
    expect(existsSync(filePath)).toBe(true);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(true);

    // Verify physical file is deleted
    expect(existsSync(filePath)).toBe(false);

    // Verify database record is deleted
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(0);

    cleanupFile(filePath);
  });

  it('should delete database record even if physical file does not exist', async () => {
    const budgetRequest = await createTestBudgetRequest('draft');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, false);

    // Verify file does not exist
    expect(existsSync(filePath)).toBe(false);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(true);

    // Verify database record is deleted
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(0);
  });

  it('should return false for non-existent file upload', async () => {
    const result = await deleteFileUpload(99999);

    expect(result).toBe(false);
  });

  it('should return false when budget request is not in editable state', async () => {
    const budgetRequest = await createTestBudgetRequest('approved');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, true);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(false);

    // Verify file still exists
    expect(existsSync(filePath)).toBe(true);

    // Verify database record still exists
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(1);

    cleanupFile(filePath);
  });

  it('should allow deletion when budget request status is revision_requested', async () => {
    const budgetRequest = await createTestBudgetRequest('revision_requested');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, true);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(true);

    // Verify physical file is deleted
    expect(existsSync(filePath)).toBe(false);

    // Verify database record is deleted
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(0);

    cleanupFile(filePath);
  });

  it('should not allow deletion for submitted budget requests', async () => {
    const budgetRequest = await createTestBudgetRequest('submitted');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, true);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(false);

    // Verify file still exists
    expect(existsSync(filePath)).toBe(true);

    // Verify database record still exists
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(1);

    cleanupFile(filePath);
  });

  it('should not allow deletion for rejected budget requests', async () => {
    const budgetRequest = await createTestBudgetRequest('rejected');
    const { fileUpload, filePath } = await createTestFileUpload(budgetRequest.id, true);

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(false);

    // Verify file still exists
    expect(existsSync(filePath)).toBe(true);

    // Verify database record still exists
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(1);

    cleanupFile(filePath);
  });

  it('should delete database record even if physical file deletion fails', async () => {
    const budgetRequest = await createTestBudgetRequest('draft');
    const { fileUpload } = await createTestFileUpload(budgetRequest.id, false);
    
    // Use an invalid file path that would cause file deletion to fail
    await db.update(fileUploadsTable)
      .set({ file_path: '/invalid/path/that/does/not/exist.txt' })
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    const result = await deleteFileUpload(fileUpload.id);

    expect(result).toBe(true);

    // Verify database record is still deleted despite file deletion failure
    const dbResult = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();

    expect(dbResult).toHaveLength(0);
  });
});