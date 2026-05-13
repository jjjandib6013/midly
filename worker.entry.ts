// ──────────────────────────────────────────────────────────────────────────
// Standalone worker entrypoint (fix F — groundwork).
//
// Today, server.ts imports ./src/ai/worker into the same process. That works
// but means heavy AI inference runs on the same CPU/RAM budget as the API.
// A slow Phase 2 job still slows down every request, and a worker crash
// (historically a real risk) takes the API down with it.
//
// Running this file via `tsx worker.entry.ts` on its own Railway service
// isolates the two concerns. The worker process:
//   • subscribes to the BullMQ kyc-processing queue
//   • owns its own Prisma connection pool
//   • can be scaled independently of the API
//   • crashes cleanly without affecting user-facing endpoints
//
// To activate: create a second Railway service with the same repo, set its
// start command to `npx tsx worker.entry.ts`, and set env var
// WORKER_ONLY_MODE=true on the API service to make server.ts skip its
// inline worker import (change not yet committed — flip it when you enable
// the separate service).
//
// Until then this file is dormant code: harmless, runs the same module the
// API already runs.
// ──────────────────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
dotenv.config();

import './src/ai/worker';

console.log('[WORKER ENTRY] Standalone AI worker running. Waiting for BullMQ jobs...');

// Keep the process alive. BullMQ's Worker already does this via an open
// Redis connection, but an explicit keepalive makes intent clear.
setInterval(() => {}, 60_000);
