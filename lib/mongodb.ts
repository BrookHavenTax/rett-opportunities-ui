import mongoose from 'mongoose';

/**
 * MongoDB connection singleton.
 *
 * Production: connects to the real `MONGODB_URI` (MongoDB Atlas).
 *
 * Local development: if `MONGODB_URI` is unset or set to the sentinel
 * `"memory"`, an in-memory MongoDB **replica set** is booted automatically.
 * A replica set (not a standalone) is required so the import pipeline's
 * multi-document transactions work locally exactly as they do on Atlas.
 *
 * The connection (and the in-memory server) are cached on `globalThis` so that
 * Next.js hot-reloads and serverless invocations reuse a single connection
 * instead of opening a new one on every request.
 */

const DB_NAME = 'rett';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  // Loosely typed to avoid importing mongodb-memory-server into client bundles.
  mem: { getUri: () => string; stop: () => Promise<boolean> } | null;
};

const globalForMongoose = globalThis as unknown as {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.__mongooseCache ??
  (globalForMongoose.__mongooseCache = { conn: null, promise: null, mem: null });

function isRealUri(uri: string | undefined): uri is string {
  return (
    !!uri &&
    uri !== 'memory' &&
    (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
  );
}

async function resolveUri(): Promise<string> {
  const envUri = process.env.MONGODB_URI;
  if (isRealUri(envUri)) return envUri;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MONGODB_URI is not set. A real MongoDB connection string is required in production.',
    );
  }

  // Dev fallback: boot (or reuse) an in-memory replica set.
  if (!cache.mem) {
    // Dynamic import keeps mongodb-memory-server out of the client/edge bundle.
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    // eslint-disable-next-line no-console
    console.log(
      '[mongodb] No MONGODB_URI provided — starting in-memory MongoDB replica set (dev only)…',
    );
    const mem = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    cache.mem = mem;
  }
  return cache.mem.getUri();
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = resolveUri().then(async (uri) => {
      const conn = await mongoose.connect(uri, {
        dbName: DB_NAME,
        bufferCommands: false,
        serverSelectionTimeoutMS: 15_000,
      });
      // Dev convenience: when running against the in-memory server, seed the
      // database on first boot so the UI has data with zero setup. Folded into
      // the shared promise so it runs exactly once even under concurrent calls.
      if (cache.mem) {
        const { autoSeedIfEmpty } = await import('@/lib/seedData');
        await autoSeedIfEmpty();
      }
      return conn;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}

/** Tear down the connection and any in-memory server (used by scripts/tests). */
export async function dbDisconnect(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
  if (cache.mem) {
    await cache.mem.stop();
    cache.mem = null;
  }
}

export default dbConnect;
