import { z } from 'zod';

// Budget Request Status enum
export const budgetRequestStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revision_requested'
]);

export type BudgetRequestStatus = z.infer<typeof budgetRequestStatusSchema>;

// Budget Category enum
export const budgetCategorySchema = z.enum([
  'personnel',
  'goods_services',
  'capital_expenditure',
  'operational',
  'maintenance',
  'training',
  'travel',
  'other'
]);

export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

// Priority Level enum
export const priorityLevelSchema = z.enum([
  'critical',
  'high',
  'medium',
  'low'
]);

export type PriorityLevel = z.infer<typeof priorityLevelSchema>;

// File Upload schema
export const fileUploadSchema = z.object({
  id: z.number(),
  budget_request_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().int(),
  mime_type: z.string(),
  uploaded_at: z.coerce.date()
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Budget Item schema (for detailed budget breakdowns)
export const budgetItemSchema = z.object({
  id: z.number(),
  budget_request_id: z.number(),
  category: budgetCategorySchema,
  description: z.string(),
  unit: z.string().nullable(),
  quantity: z.number().int().nullable(),
  unit_cost: z.number(),
  total_cost: z.number(),
  justification: z.string().nullable(),
  created_at: z.coerce.date()
});

export type BudgetItem = z.infer<typeof budgetItemSchema>;

// Main Budget Request schema
export const budgetRequestSchema = z.object({
  id: z.number(),
  department_name: z.string(),
  department_code: z.string().nullable(),
  contact_person: z.string(),
  contact_email: z.string().email(),
  contact_phone: z.string().nullable(),
  fiscal_year: z.number().int(),
  request_title: z.string(),
  request_description: z.string(),
  total_amount: z.number(),
  priority_level: priorityLevelSchema,
  justification: z.string(),
  expected_outcomes: z.string(),
  timeline_start: z.coerce.date().nullable(),
  timeline_end: z.coerce.date().nullable(),
  status: budgetRequestStatusSchema,
  submitted_at: z.coerce.date().nullable(),
  reviewed_at: z.coerce.date().nullable(),
  reviewer_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BudgetRequest = z.infer<typeof budgetRequestSchema>;

// Input schema for creating budget requests
export const createBudgetRequestInputSchema = z.object({
  department_name: z.string().min(1, 'Department name is required'),
  department_code: z.string().nullable(),
  contact_person: z.string().min(1, 'Contact person is required'),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().nullable(),
  fiscal_year: z.number().int().min(2020).max(2050),
  request_title: z.string().min(1, 'Request title is required'),
  request_description: z.string().min(10, 'Description must be at least 10 characters'),
  total_amount: z.number().positive('Amount must be positive'),
  priority_level: priorityLevelSchema,
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
  expected_outcomes: z.string().min(10, 'Expected outcomes must be at least 10 characters'),
  timeline_start: z.coerce.date().nullable(),
  timeline_end: z.coerce.date().nullable(),
  status: budgetRequestStatusSchema.default('draft')
});

export type CreateBudgetRequestInput = z.infer<typeof createBudgetRequestInputSchema>;

// Input schema for updating budget requests
export const updateBudgetRequestInputSchema = z.object({
  id: z.number(),
  department_name: z.string().min(1).optional(),
  department_code: z.string().nullable().optional(),
  contact_person: z.string().min(1).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().nullable().optional(),
  fiscal_year: z.number().int().min(2020).max(2050).optional(),
  request_title: z.string().min(1).optional(),
  request_description: z.string().min(10).optional(),
  total_amount: z.number().positive().optional(),
  priority_level: priorityLevelSchema.optional(),
  justification: z.string().min(20).optional(),
  expected_outcomes: z.string().min(10).optional(),
  timeline_start: z.coerce.date().nullable().optional(),
  timeline_end: z.coerce.date().nullable().optional(),
  status: budgetRequestStatusSchema.optional(),
  reviewer_notes: z.string().nullable().optional()
});

export type UpdateBudgetRequestInput = z.infer<typeof updateBudgetRequestInputSchema>;

// Input schema for creating budget items
export const createBudgetItemInputSchema = z.object({
  budget_request_id: z.number(),
  category: budgetCategorySchema,
  description: z.string().min(1, 'Description is required'),
  unit: z.string().nullable(),
  quantity: z.number().int().positive().nullable(),
  unit_cost: z.number().positive('Unit cost must be positive'),
  total_cost: z.number().positive('Total cost must be positive'),
  justification: z.string().nullable()
});

export type CreateBudgetItemInput = z.infer<typeof createBudgetItemInputSchema>;

// Input schema for updating budget items
export const updateBudgetItemInputSchema = z.object({
  id: z.number(),
  category: budgetCategorySchema.optional(),
  description: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  quantity: z.number().int().positive().nullable().optional(),
  unit_cost: z.number().positive().optional(),
  total_cost: z.number().positive().optional(),
  justification: z.string().nullable().optional()
});

export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemInputSchema>;

// Input schema for file uploads
export const createFileUploadInputSchema = z.object({
  budget_request_id: z.number(),
  filename: z.string().min(1, 'Filename is required'),
  original_filename: z.string().min(1, 'Original filename is required'),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().int().positive('File size must be positive'),
  mime_type: z.string().min(1, 'MIME type is required')
});

export type CreateFileUploadInput = z.infer<typeof createFileUploadInputSchema>;

// Query schemas
export const getBudgetRequestsQuerySchema = z.object({
  department_name: z.string().optional(),
  fiscal_year: z.number().int().optional(),
  status: budgetRequestStatusSchema.optional(),
  priority_level: priorityLevelSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export type GetBudgetRequestsQuery = z.infer<typeof getBudgetRequestsQuerySchema>;

// Response schemas for pagination
export const paginatedBudgetRequestsSchema = z.object({
  data: z.array(budgetRequestSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean()
});

export type PaginatedBudgetRequests = z.infer<typeof paginatedBudgetRequestsSchema>;