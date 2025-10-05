import logger from "@logger";
import { randomBytes } from "crypto";
import { CacheEntry } from "@/src/repository/cache/types";
import { createCacheEntry } from "@/src/repository/cache/createCacheEntry";
import { getCacheEntry } from "@/src/repository/cache/getCacheEntry";

// Ensure the table name is present in the env
const TABLE_NAME = process.env.CACHE_TABLE_NAME;
if (!TABLE_NAME) {
  throw new Error("CACHE_TABLE_NAME environment variable has not been set");
}

const memoryCache: Map<CacheEntry["id"], CacheEntry> = new Map();

/**
 * Creates a TTL for cache entries.
 * @param msFromNow How many milliseconds in the future the TTL should be.
 *                  Default: 5 minutes.
 * @returns Unix timestamp (seconds since epoch) suitable for DynamoDB TTL fields
 */
const createTtl = (msFromNow: number = 5 * 60 * 1000) =>
  Math.floor((Date.now() + msFromNow) / 1000);

/**
 * Checks if a cached entry is still valid (TTL check).
 * @param entry Entry whose TTL to check.
 */
const isStillValid = (entry: CacheEntry) =>
  entry.ttl > Math.floor(Date.now() / 1000);

/**
 * Persists a value in the cache.
 * @param value Value to persist. Use JSON stringify for complex objects.
 */
export const saveToCache = async (
  value: CacheEntry["value"],
): Promise<CacheEntry["id"]> => {
  const id = randomBytes(8).toString("hex");
  const cacheEntry: CacheEntry = { id, value, ttl: createTtl() };

  // Save to DynamoDB cache
  await createCacheEntry({
    tableName: TABLE_NAME,
    cacheEntry,
  });

  // Save to memory cache
  memoryCache.set(id, cacheEntry);

  return id;
};

/**
 * Gets a value stored in the cache.
 * @param id Storage key
 * @returns Stored value only (no id or other properties)
 */
export const getFromCache = async (
  id: CacheEntry["id"],
): Promise<CacheEntry["value"] | undefined> => {
  // Check the memory cache first
  const memCachedEntry = memoryCache.get(id);

  if (memCachedEntry) {
    if (isStillValid(memCachedEntry)) {
      logger.debug(`Memory cache hit for ${id}`);
      return memCachedEntry.value;
    }

    // Remove expired entry
    memoryCache.delete(id);
    logger.debug(`Memory cache entry for ${id} found, but is no longer valid`);
  }

  // Check DynamoDB
  const dbEntry = await getCacheEntry({
    tableName: TABLE_NAME,
    id,
  });

  if (dbEntry) {
    // Old entries will eventually be automatically removed from DynamoDB, so they won't even be found at all.
    // Let's check the TTL regardless.
    if (isStillValid(dbEntry)) {
      logger.debug(`DynamoDB cache hit for ${id}`);
      // Save the valid entry to the memory cache
      memoryCache.set(id, dbEntry);

      return dbEntry.value;
    } else {
      logger.debug(
        `DynamoDB cache entry for ${id} found, but is no longer valid`,
      );
    }
  }

  // No cached entries
  return undefined;
};
