import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  pgEnum,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const budgetRequestStatusEnum = pgEnum('budget_request_status', [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revision_requested'
]);

export const budgetCategoryEnum = pgEnum('budget_category', [
  'personnel',
  'goods_services',
  'capital_expenditure',
  'operational',
  'maintenance',
  'training',
  'travel',
  'other'
]);

export const priorityLevelEnum = pgEnum('priority_level', [
  'critical',
  'high',
  'medium',
  'low'
]);

// Budget Requests table
export const budgetRequestsTable = pgTable('budget_requests', {
  id: serial('id').primaryKey(),
  department_name: text('department_name').notNull(),
  department_code: varchar('department_code', { length: 50 }),
  contact_person: text('contact_person').notNull(),
  contact_email: text('contact_email').notNull(),
  contact_phone: varchar('contact_phone', { length: 20 }),
  fiscal_year: integer('fiscal_year').notNull(),
  request_title: text('request_title').notNull(),
  request_description: text('request_description').notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  priority_level: priorityLevelEnum('priority_level').notNull(),
  justification: text('justification').notNull(),
  expected_outcomes: text('expected_outcomes').notNull(),
  timeline_start: timestamp('timeline_start'),
  timeline_end: timestamp('timeline_end'),
  status: budgetRequestStatusEnum('status').notNull().default('draft'),
  submitted_at: timestamp('submitted_at'),
  reviewed_at: timestamp('reviewed_at'),
  reviewer_notes: text('reviewer_notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Budget Items table (for detailed budget breakdowns)
export const budgetItemsTable = pgTable('budget_items', {
  id: serial('id').primaryKey(),
  budget_request_id: integer('budget_request_id')
    .references(() => budgetRequestsTable.id, { onDelete: 'cascade' })
    .notNull(),
  category: budgetCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  unit: text('unit'),
  quantity: integer('quantity'),
  unit_cost: numeric('unit_cost', { precision: 15, scale: 2 }).notNull(),
  total_cost: numeric('total_cost', { precision: 15, scale: 2 }).notNull(),
  justification: text('justification'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// File Uploads table (for Excel documents and other attachments)
export const fileUploadsTable = pgTable('file_uploads', {
  id: serial('id').primaryKey(),
  budget_request_id: integer('budget_request_id')
    .references(() => budgetRequestsTable.id, { onDelete: 'cascade' })
    .notNull(),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
});

// Define relations
export const budgetRequestsRelations = relations(budgetRequestsTable, ({ many }) => ({
  budgetItems: many(budgetItemsTable),
  fileUploads: many(fileUploadsTable),
}));

export const budgetItemsRelations = relations(budgetItemsTable, ({ one }) => ({
  budgetRequest: one(budgetRequestsTable, {
    fields: [budgetItemsTable.budget_request_id],
    references: [budgetRequestsTable.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploadsTable, ({ one }) => ({
  budgetRequest: one(budgetRequestsTable, {
    fields: [fileUploadsTable.budget_request_id],
    references: [budgetRequestsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type BudgetRequest = typeof budgetRequestsTable.$inferSelect;
export type NewBudgetRequest = typeof budgetRequestsTable.$inferInsert;
export type BudgetItem = typeof budgetItemsTable.$inferSelect;
export type NewBudgetItem = typeof budgetItemsTable.$inferInsert;
export type FileUpload = typeof fileUploadsTable.$inferSelect;
export type NewFileUpload = typeof fileUploadsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  budgetRequests: budgetRequestsTable,
  budgetItems: budgetItemsTable,
  fileUploads: fileUploadsTable,
};

export const tableRelations = {
  budgetRequestsRelations,
  budgetItemsRelations,
  fileUploadsRelations,
};