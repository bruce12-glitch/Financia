import { startBackendServer } from './backend/app.ts';

startBackendServer().catch((err) => {
  console.error('[Financia] Fatal startup error:', err);
  process.exit(1);
});
