import {
  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  STORAGE_KEYS
} from "../shared/constants";
import type { BriefingResponse, CacheEntry, StorageShape } from "../shared/types";

const SENSITIVE_QUERY_PARAM = /^(token|key|secret|auth|session|sig|signature|access_token|id_token|code|state|nonce)$/i;

function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAM.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

async function toSha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function getCacheMap(): Promise<Record<string, CacheEntry>> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.cache)) as StorageShape;
  return result.glanceCache ?? {};
}

async function saveCacheMap(cache: Record<string, CacheEntry>): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.cache]: cache
  });
}

export function shouldUseCachedBriefing(entry: CacheEntry): boolean {
  return entry.expiresAt > Date.now();
}

export async function getCachedBriefing(rawUrl: string): Promise<CacheEntry | null> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const cacheKey = await toSha256(normalizedUrl);
  const cache = await getCacheMap();
  const entry = cache[cacheKey];

  if (!entry) {
    return null;
  }

  if (!shouldUseCachedBriefing(entry)) {
    delete cache[cacheKey];
    await saveCacheMap(cache);
    return null;
  }

  return entry;
}

export async function setCachedBriefing(
  rawUrl: string,
  briefing: BriefingResponse
): Promise<CacheEntry> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const cacheKey = await toSha256(normalizedUrl);
  const cache = await getCacheMap();
  const now = Date.now();

  const entry: CacheEntry = {
    cacheKey,
    url: normalizedUrl,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    briefing
  };

  const nextEntries = Object.values({
    ...cache,
    [cacheKey]: entry
  })
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_CACHE_ENTRIES);

  await saveCacheMap(
    Object.fromEntries(nextEntries.map((value) => [value.cacheKey, value]))
  );

  return entry;
}

export async function clearCachedBriefings(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.cache);
}
