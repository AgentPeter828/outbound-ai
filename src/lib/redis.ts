import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const CACHE_TTL = 60 * 60 * 24 // 24 hours in seconds

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key)
    return cached
  } catch (error) {
    console.error('Redis cache get error:', error)
    return null
  }
}

export async function setInCache<T>(key: string, value: T, ttl: number = CACHE_TTL): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl })
  } catch (error) {
    console.error('Redis cache set error:', error)
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Redis cache delete error:', error)
  }
}

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cached = await getFromCache<T>(key)
  if (cached) {
    return cached
  }

  const fresh = await fetchFn()
  await setInCache(key, fresh, ttl)
  return fresh
}

// Apollo-specific cache keys
export function apolloCompanyKey(domain: string): string {
  return `apollo:company:${domain}`
}

export function apolloContactKey(email: string): string {
  return `apollo:contact:${email}`
}

export function apolloSearchKey(filters: Record<string, unknown>): string {
  return `apollo:search:${JSON.stringify(filters)}`
}
