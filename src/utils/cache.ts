export type CacheItem<T> = {
  data: T
  timestamp: number
  ttl: number
}

// 🔥 Prefix for localStorage keys to avoid collisions
const STORAGE_PREFIX = "novelnest_cache_"

// In-memory cache
const memoryCache = new Map<string, CacheItem<any>>()

// 🔥 Track ongoing requests (deduplication)
const pendingRequests = new Map<string, Promise<any>>()

// 🖼️ Image Metadata Cache (uri -> localPath/blobUrl)
const imageMetaCache = new Map<string, string>()
const IMAGE_META_KEY = "novelnest_image_metadata"

// 📂 Image Cache (Cache API)
const IMAGE_CACHE_NAME = 'novelnest-image-cache';
let imageCacheInitialized = false;

const ensureImageCache = async () => {
  if (imageCacheInitialized) return;
  await caches.open(IMAGE_CACHE_NAME);
  imageCacheInitialized = true;
};

export const CACHE_TTL = {
  NEAR_REALTIME: 30 * 1000, // 30s
  FEED: 3 * 60 * 1000, // 3min
  PROFILE: 5 * 60 * 1000, // 5min
  CONTENT: 15 * 60 * 1000, // 15min
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// ♻️ Initialize cache from localStorage on app start
export const initCacheFromStorage = async () => {
  try {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const itemStr = localStorage.getItem(key)
          if (itemStr) {
            const item: CacheItem<any> = JSON.parse(itemStr)
            if (now - item.timestamp <= item.ttl) {
              // Valid! Load it into the memory map
              const originalKey = key.replace(STORAGE_PREFIX, "")
              memoryCache.set(originalKey, item)
            } else {
              // Expired
              keysToRemove.push(key)
            }
          }
        } catch (e) {
          // Bad JSON or corrupted data, clean it up
          keysToRemove.push(key)
        }
      }
    }

    // 🖼️ Load Image Metadata (We only care that it EXISTS in cache, blob URLs are session-only)
    const imageMetaStr = localStorage.getItem(IMAGE_META_KEY)
    if (imageMetaStr) {
      try {
        JSON.parse(imageMetaStr)
        // Note: We don't load blobUrls into imageMetaCache here because they are invalid across sessions.
        // We just keep the knowledge that they ARE in the persistent storage for optimization,
        // but it's safer to just let getOrDownloadImage re-generate them from Cache API.
      } catch (e) {}
    }

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(k => localStorage.removeItem(k))
    }
  } catch (e) {
    console.warn("localStorage is not available", e)
  } finally {
    isInitialized = true
  }
}

// 🔥 Helper to evict oldest items when localStorage is full
const evictOldestStorage = async () => {
  try {
    const items = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const itemStr = localStorage.getItem(key)
          if (itemStr) {
            const parsed = JSON.parse(itemStr)
            items.push({ key, timestamp: parsed.timestamp })
          }
        } catch (e) {}
      }
    }
    
    // Sort oldest first
    items.sort((a, b) => a.timestamp - b.timestamp)
    
    // Delete the oldest 30% of cache items to free up bulk space
    const toDelete = Math.max(1, Math.floor(items.length * 0.3))
    const keysToRemove = items.slice(0, toDelete).map(item => item.key)
    
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(k => localStorage.removeItem(k))
    }
  } catch (e) {
    console.warn("Failed during cache eviction", e)
  }
}

/**
 * Get cached data if valid
 */
export const getCachedData = <T>(key: string): T | null => {
  const item = memoryCache.get(key)
  if (!item) return null

  const now = Date.now()

  if (now - item.timestamp > item.ttl) {
    memoryCache.delete(key)
    try {
      localStorage.removeItem(STORAGE_PREFIX + key)
    } catch(e) {}
    return null
  }

  return item.data as T
}

/**
 * Set cache
 */
export const setCachedData = async <T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.FEED
): Promise<void> => {
  const cacheItem = {
    data,
    timestamp: Date.now(),
    ttl,
  }
  
  memoryCache.set(key, cacheItem)
  
  // 🔥 Also save to localStorage for cross-refresh persistence
  try {
    const stringified = JSON.stringify(cacheItem)
    
    // If a single item is insanely large (e.g. > 2.5MB), don't even try to store it
    if (stringified.length > 2500000) {
      console.warn(`[CACHE] Item ${key} is too large for localStorage (${Math.round(stringified.length / 1024)}KB)`)
      return
    }

    try {
      localStorage.setItem(STORAGE_PREFIX + key, stringified)
    } catch (e: any) {
      // If quota exceeded, evict old items and try exactly one more time
      if (e.name === "QuotaExceededError" || e.message?.toLowerCase().includes("quota")) {
        await evictOldestStorage()
        try {
          localStorage.setItem(STORAGE_PREFIX + key, stringified)
        } catch (retryErr) {
          console.warn(`[CACHE] Still exceeded quota after eviction for ${key}`)
        }
      } else {
        throw e
      }
    }
  } catch (e) {
    console.warn("Failed to persist cache to storage", e)
  }
}

/**
 * Clear specific or all cache
 */
export const clearCache = async (key?: string): Promise<void> => {
  if (key) {
    memoryCache.delete(key)
    try {
      localStorage.removeItem(STORAGE_PREFIX + key)
    } catch(e) {}
  } else {
    memoryCache.clear()
    imageMetaCache.clear()
    try {
      // Clear data cache
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith(STORAGE_PREFIX) || k === IMAGE_META_KEY)) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      
      // Also clear Cache API (images)
      await caches.delete(IMAGE_CACHE_NAME);
      imageCacheInitialized = false;

    } catch(e) {}
  }
}

/**
 * 🔥 Clear cache by key prefix
 * Example: invalidateByPrefix("novels")
 */
export const invalidateByPrefix = async (prefix: string): Promise<void> => {
  const keysToRemove: string[] = []
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
      keysToRemove.push(STORAGE_PREFIX + key)
    }
  }
  
  if (keysToRemove.length > 0) {
    try {
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch(e) {}
  }
}

/**
 * 🔥 Invalidate a single key
 */
export const invalidateCache = async (key: string): Promise<void> => {
  memoryCache.delete(key)
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch(e) {}
}

/**
 * Optional logging
 */
const log = (message: string) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message)
  }
}

export const ensureInitialized = () => {
  if (isInitialized) return Promise.resolve()
  if (!initPromise) initPromise = initCacheFromStorage()
  return initPromise
}

/**
 * 🔥 Strip large fields from data to save storage space
 */
export const stripLargeFields = (data: any, level: 'feed' | 'overview'): any => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => stripLargeFields(item, level));
  }

  // Clone to avoid mutating original data in memory if it's still being used
  const stripped = { ...data };

  // Handle Novel-like objects
  if (stripped.chapters !== undefined || stripped.prologue !== undefined) {
    if (level === 'feed') {
      // Complete removal for list views
      delete stripped.chapters;
      delete stripped.prologue;
      delete stripped.epilogue;
      delete stripped.authorsNote;
      delete stripped.content; // In case it's a generic content field
    } else if (level === 'overview') {
      // Keep chapter metadata but strip content
      if (Array.isArray(stripped.chapters)) {
        stripped.chapters = stripped.chapters.map((ch: any) => ({
          id: ch.id,
          title: ch.title,
          readingOrder: ch.readingOrder,
          isLocked: ch.isLocked,
          price: ch.price,
          createdAt: ch.createdAt
          // content and chatMessages are stripped
        }));
      }
      // Prologue and Epilogue are usually small enough for Overview, but we can strip if they are huge.
      // For now, let's keep them as they are often displayed or at least expected.
    }
  }

  // Handle Poem-like objects
  if (stripped.content !== undefined && level === 'feed') {
    delete stripped.content;
  }

  return stripped;
};

/**
 * 🚀 Main caching wrapper
 * @param imageSelector Optional function to extract image URLs from data for pre-fetching
 * @param stripLevel Optional level of field stripping to apply before caching
 */
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.FEED,
  imageSelector?: (data: T) => (string | undefined | null)[],
  stripLevel?: 'feed' | 'overview'
): Promise<T> => {
  // Wait for storage dump to complete first
  await ensureInitialized()

  // ✅ 1. Check cache first
  const cachedData = getCachedData<T>(key)
  if (cachedData !== null) {
    log(`[CACHE HIT] ${key}`)
    
    // 🔥 Background pre-fetch images even on cache hit (to ensure they are in Cache API)
    if (imageSelector) {
      const uris = imageSelector(cachedData)
      prefetchImages(uris)
    }
    
    return cachedData
  }

  // 🔥 2. Deduplicate requests
  if (pendingRequests.has(key)) {
    log(`[PENDING REQUEST] ${key}`)
    return pendingRequests.get(key)!
  }

  log(`[CACHE MISS] ${key}`)

  // 🔥 3. Fetch and store
  const promise = fetcher()
    .then((data) => {
      // 🔥 Apply stripping if requested
      const dataToCache = stripLevel ? stripLargeFields(data, stripLevel) : data;
      
      setCachedData(key, dataToCache, ttl) // Fire-and-forget storage save
      pendingRequests.delete(key)
      
      // 🔥 Pre-fetch images
      if (imageSelector) {
        const uris = imageSelector(dataToCache)
        prefetchImages(uris)
      }
      
      return dataToCache
    })
    .catch((error) => {
      pendingRequests.delete(key)
      throw error
    })

  pendingRequests.set(key, promise)

  return promise
}

/**
 * 🖼️ Image Cache Helpers
 */

export const getImageCachedPath = (uri: string): string | null => {
  return imageMetaCache.get(uri) || null;
}

export const setImageCachedPath = async (uri: string, localPath: string): Promise<void> => {
  imageMetaCache.set(uri, localPath);
  try {
    const metaObj = Object.fromEntries(imageMetaCache.entries());
    localStorage.setItem(IMAGE_META_KEY, JSON.stringify(metaObj));
  } catch (e) {}
}

/**
 * 🔥 Prefetch a single image into the persistent cache
 */
export const prefetchImage = async (uri: string): Promise<void> => {
  if (!uri || uri.startsWith('data:') || uri.startsWith('blob:')) return;
  
  try {
    await ensureImageCache();
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(uri);
    
    if (!cachedResponse) {
      const response = await fetch(uri, { mode: 'cors' });
      if (response.ok) {
        await cache.put(uri, response.clone());
        log(`[PREFETCH] Cached ${uri}`);
      }
    }
  } catch (e) {
    console.warn(`[PREFETCH] Failed for ${uri}`, e);
  }
}

/**
 * 🔥 Prefetch multiple images
 */
export const prefetchImages = (uris: (string | undefined | null)[]): void => {
  // Filter out invalid URIs and deduplicate
  const uniqueUris = Array.from(new Set(uris.filter(Boolean) as string[]));
  uniqueUris.forEach(uri => prefetchImage(uri));
}


export const getOrDownloadImage = async (uri: string): Promise<string> => {
  await ensureInitialized();
  
  // 1. Check Meta Cache (memory) - these blobUrls are valid for the CURRENT session
  if (imageMetaCache.has(uri)) {
      return imageMetaCache.get(uri)!;
  }

  // 2. Check Cache API (persistent)
  await ensureImageCache();
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(uri);
  
  if (cachedResponse) {
    try {
      const blob = await cachedResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImageCachedPath(uri, blobUrl);
      return blobUrl;
    } catch (e) {
      console.warn(`[CACHE] Failed to read blob from cache for ${uri}`, e);
    }
  }

  // 3. Download and Cache
  try {
    const response = await fetch(uri);
    if (response.ok) {
      // Put a clone in the cache
      await cache.put(uri, response.clone());
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImageCachedPath(uri, blobUrl);
      return blobUrl;
    }
    return uri; // Fallback
  } catch (e) {
    console.error(`[CACHE] Failed to download image ${uri}`, e);
    return uri; // Fallback to raw URI
  }
}

export const invalidateCacheForImage = async (uri: string): Promise<void> => {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  await cache.delete(uri);
  
  const blobUrl = imageMetaCache.get(uri);
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
  
  imageMetaCache.delete(uri);
  // Update localStorage
  try {
    const metaObj = Object.fromEntries(imageMetaCache.entries());
    localStorage.setItem(IMAGE_META_KEY, JSON.stringify(metaObj));
  } catch (e) {}
}

