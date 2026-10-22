import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

/**
 * Gives a test file its own throwaway MongoDB.
 * It is a one-node replica set because the submit flow uses transactions,
 * which plain standalone MongoDB does not support.
 * Every test starts with empty collections but the real indexes in place.
 */
export function useTestDatabase() {
  let replSet: MongoMemoryReplSet | undefined;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri());
    // Builds the unique indexes the duplicate-protection tests depend on.
    await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });
}
