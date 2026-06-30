/**
 * Standalone seed script: `npm run seed`.
 *
 * Wipes and re-seeds the database with 50 sample listings + 4 import runs.
 * Reads MONGODB_URI from .env.local; if unset/"memory" it seeds an in-memory
 * server (note: that data lives only for the lifetime of this process — for a
 * persistent local dataset, point MONGODB_URI at a real MongoDB).
 */
import { dbConnect, dbDisconnect } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seedData';

function loadLocalEnv(): void {
  const proc = process as NodeJS.Process & {
    loadEnvFile?: (path?: string) => void;
  };
  try {
    proc.loadEnvFile?.('.env.local');
  } catch {
    // no .env.local present — fall back to the in-memory dev server
  }
}

async function main() {
  loadLocalEnv();

  const uri = process.env.MONGODB_URI;
  const target =
    uri && uri !== 'memory'
      ? uri.replace(/\/\/[^@]*@/, '//***:***@')
      : 'in-memory MongoDB (dev)';
  console.log(`[seed] Connecting to ${target}…`);

  await dbConnect();
  console.log('[seed] Connected. Seeding sample data (reset)…');

  const result = await seedDatabase({ reset: true });
  console.log(
    `[seed] Done — inserted ${result.leads} sample leads across ${result.runs} import run(s).`,
  );

  await dbDisconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
