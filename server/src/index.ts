import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createBudgetRequestInputSchema,
  updateBudgetRequestInputSchema,
  getBudgetRequestsQuerySchema,
  createBudgetItemInputSchema,
  updateBudgetItemInputSchema,
  createFileUploadInputSchema,
} from './schema';

// Import handlers
import { createBudgetRequest } from './handlers/create_budget_request';
import { getBudgetRequests } from './handlers/get_budget_requests';
import { getBudgetRequestById } from './handlers/get_budget_request_by_id';
import { updateBudgetRequest } from './handlers/update_budget_request';
import { submitBudgetRequest } from './handlers/submit_budget_request';
import { createBudgetItem } from './handlers/create_budget_item';
import { getBudgetItems } from './handlers/get_budget_items';
import { updateBudgetItem } from './handlers/update_budget_item';
import { deleteBudgetItem } from './handlers/delete_budget_item';
import { uploadFile } from './handlers/upload_file';
import { getFileUploads } from './handlers/get_file_uploads';
import { deleteFileUpload } from './handlers/delete_file_upload';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Budget Request procedures
  createBudgetRequest: publicProcedure
    .input(createBudgetRequestInputSchema)
    .mutation(({ input }) => createBudgetRequest(input)),

  getBudgetRequests: publicProcedure
    .input(getBudgetRequestsQuerySchema)
    .query(({ input }) => getBudgetRequests(input)),

  getBudgetRequestById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getBudgetRequestById(input.id)),

  updateBudgetRequest: publicProcedure
    .input(updateBudgetRequestInputSchema)
    .mutation(({ input }) => updateBudgetRequest(input)),

  submitBudgetRequest: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => submitBudgetRequest(input.id)),

  // Budget Item procedures
  createBudgetItem: publicProcedure
    .input(createBudgetItemInputSchema)
    .mutation(({ input }) => createBudgetItem(input)),

  getBudgetItems: publicProcedure
    .input(z.object({ budgetRequestId: z.number() }))
    .query(({ input }) => getBudgetItems(input.budgetRequestId)),

  updateBudgetItem: publicProcedure
    .input(updateBudgetItemInputSchema)
    .mutation(({ input }) => updateBudgetItem(input)),

  deleteBudgetItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteBudgetItem(input.id)),

  // File Upload procedures
  uploadFile: publicProcedure
    .input(createFileUploadInputSchema)
    .mutation(({ input }) => uploadFile(input)),

  getFileUploads: publicProcedure
    .input(z.object({ budgetRequestId: z.number() }))
    .query(({ input }) => getFileUploads(input.budgetRequestId)),

  deleteFileUpload: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteFileUpload(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true,
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`🚀 Government Budget Request API server listening at port: ${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`  - Health: GET /healthcheck`);
  console.log(`  - Budget Requests: POST /createBudgetRequest, GET /getBudgetRequests`);
  console.log(`  - Budget Items: POST /createBudgetItem, GET /getBudgetItems`);
  console.log(`  - File Uploads: POST /uploadFile, GET /getFileUploads`);
}

start();