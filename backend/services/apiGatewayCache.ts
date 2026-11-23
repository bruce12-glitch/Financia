/**
 * Financia Multi-Tier Market Data API Gateway Cache
 *
 * Implements:
 * - L1 In-Process LRU Cache with Soft/Hard TTL (Stale-While-Revalidate)
 * - In-flight Request Coalescing (eliminates thundering herds)
 * - Per-Provider Circuit Breaker & Token-Bucket Rate Limiter
 */

export interface GatewayCacheEntry<T> {
  value: T;
  storedAtMs: number;
  softExpiryMs: number;
  hardExpiryMs: number;
  provider: string;
}

export interface CircuitBreakerState {
  provider: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  openedAtMs: number | null;
  lastError: string | null;
}

export interface GatewayMetricsSnapshot {
  l1Entries: number;
  maxL1Entries: number;
  hits: number;
  staleHits: number;
  misses: number;
  coalescedRequests: number;
  backgroundRefreshes: number;
  hitRatioPct: number;
  circuits: CircuitBreakerState[];
  lastAmfiSyncUtc: string | null;
  uptimeSeconds: number;
}

interface ProviderCircuitInternal {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  openedAtMs: number | null;
  lastError: string | null;
  tokens: number;
  lastRefillMs: number;
}

export class MarketApiGateway {
  private readonly maxEntries: number;
  private readonly cache = new Map<string, GatewayCacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly circuits = new Map<string, ProviderCircuitInternal>();
  private readonly startedAtMs = Date.now();

  private hits = 0;
  private staleHits = 0;
  private misses = 0;
  private coalescedRequests = 0;
  private backgroundRefreshes = 0;
  private lastAmfiSyncUtc: string | null = null;

  constructor(maxEntries = 1500) {
    this.maxEntries = maxEntries;
  }

  public recordAmfiSync(timestampUtc: string): void {
    this.lastAmfiSyncUtc = timestampUtc;
  }

  private getOrCreateCircuit(provider: string): ProviderCircuitInternal {
    let entry = this.circuits.get(provider);
    if (!entry) {
      entry = {
        state: 'CLOSED',
        consecutiveFailures: 0,
        openedAtMs: null,
        lastError: null,
        tokens: 30,
        lastRefillMs: Date.now(),
      };
      this.circuits.set(provider, entry);
    }
    return entry;
  }

  private consumeToken(provider: string, maxTokens = 30, refillPerSec = 5): boolean {
    const circuit = this.getOrCreateCircuit(provider);
    const now = Date.now();
    const elapsedSec = (now - circuit.lastRefillMs) / 1000;
    if (elapsedSec > 0) {
      circuit.tokens = Math.min(maxTokens, circuit.tokens + elapsedSec * refillPerSec);
      circuit.lastRefillMs = now;
    }
    if (circuit.tokens < 1) {
      return false;
    }
    circuit.tokens -= 1;
    return true;
  }

  private canCallProvider(provider: string, cooldownMs = 45_000): boolean {
    const circuit = this.getOrCreateCircuit(provider);
    if (circuit.state === 'CLOSED') return true;
    if (circuit.state === 'OPEN' && circuit.openedAtMs !== null) {
      if (Date.now() - circuit.openedAtMs >= cooldownMs) {
        circuit.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  private recordSuccess(provider: string): void {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.state = 'CLOSED';
    circuit.consecutiveFailures = 0;
    circuit.openedAtMs = null;
    circuit.lastError = null;
  }

  private recordFailure(provider: string, err: unknown, threshold = 3): void {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.consecutiveFailures += 1;
    circuit.lastError = err instanceof Error ? err.message : String(err);
    if (circuit.consecutiveFailures >= threshold) {
      circuit.state = 'OPEN';
      circuit.openedAtMs = Date.now();
    }
  }

  private setL1<T>(
    key: string,
    value: T,
    provider: string,
    softTtlMs: number,
    hardTtlMs: number
  ): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    const now = Date.now();
    this.cache.set(key, {
      value,
      provider,
      storedAtMs: now,
      softExpiryMs: now + softTtlMs,
      hardExpiryMs: now + Math.max(softTtlMs, hardTtlMs),
    });
  }

  /**
   * Fetch through L1 SWR cache + in-flight coalescing + circuit breaker.
   * Falls back to stale data or fallback() if upstream fails or circuit is open.
   */
  public async getOrFetch<T>(options: {
    key: string;
    provider: string;
    softTtlMs: number;
    hardTtlMs: number;
    fetcher: () => Promise<T>;
    fallback?: () => T | Promise<T>;
  }): Promise<{ data: T; cacheStatus: 'HIT' | 'STALE' | 'MISS' | 'FALLBACK'; updatedAtUtc: string }> {
    const { key, provider, softTtlMs, hardTtlMs, fetcher, fallback } = options;
    const now = Date.now();
    const cached = this.cache.get(key) as GatewayCacheEntry<T> | undefined;

    if (cached && now < cached.softExpiryMs) {
      this.hits += 1;
      // Refresh LRU position
      this.cache.delete(key);
      this.cache.set(key, cached);
      return {
        data: cached.value,
        cacheStatus: 'HIT',
        updatedAtUtc: new Date(cached.storedAtMs).toISOString(),
      };
    }

    // Stale-while-revalidate window: serve stale immediately and refresh asynchronously
    if (cached && now < cached.hardExpiryMs) {
      this.staleHits += 1;
      if (!this.inFlight.has(key) && this.canCallProvider(provider) && this.consumeToken(provider)) {
        this.backgroundRefreshes += 1;
        const bgPromise = fetcher()
          .then((fresh) => {
            this.recordSuccess(provider);
            this.setL1(key, fresh, provider, softTtlMs, hardTtlMs);
            return fresh;
          })
          .catch((err) => {
            this.recordFailure(provider, err);
            return cached.value;
          })
          .finally(() => {
            this.inFlight.delete(key);
          });
        this.inFlight.set(key, bgPromise);
      }
      return {
        data: cached.value,
        cacheStatus: 'STALE',
        updatedAtUtc: new Date(cached.storedAtMs).toISOString(),
      };
    }

    // Coalesce concurrent cold fetches for identical key
    const existingInFlight = this.inFlight.get(key) as Promise<T> | undefined;
    if (existingInFlight) {
      this.coalescedRequests += 1;
      const resolved = await existingInFlight;
      return {
        data: resolved,
        cacheStatus: 'HIT',
        updatedAtUtc: new Date().toISOString(),
      };
    }

    this.misses += 1;

    if (!this.canCallProvider(provider) || !this.consumeToken(provider)) {
      if (cached) {
        return {
          data: cached.value,
          cacheStatus: 'STALE',
          updatedAtUtc: new Date(cached.storedAtMs).toISOString(),
        };
      }
      if (fallback) {
        return {
          data: await fallback(),
          cacheStatus: 'FALLBACK',
          updatedAtUtc: new Date().toISOString(),
        };
      }
      throw new Error(`Provider ${provider} temporarily throttled or circuit open.`);
    }

    const fetchPromise = (async () => {
      try {
        const fresh = await fetcher();
        this.recordSuccess(provider);
        this.setL1(key, fresh, provider, softTtlMs, hardTtlMs);
        return fresh;
      } catch (err) {
        this.recordFailure(provider, err);
        if (cached) {
          return cached.value;
        }
        if (fallback) {
          return await fallback();
        }
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    const data = await fetchPromise;
    const updated = this.cache.get(key);
    return {
      data,
      cacheStatus: updated ? 'MISS' : 'FALLBACK',
      updatedAtUtc: new Date(updated?.storedAtMs ?? Date.now()).toISOString(),
    };
  }

  public invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) {
        this.cache.delete(k);
        removed += 1;
      }
    }
    return removed;
  }

  public getMetrics(): GatewayMetricsSnapshot {
    const totalReads = this.hits + this.staleHits + this.misses;
    const hitRatioPct =
      totalReads > 0 ? Number((((this.hits + this.staleHits) / totalReads) * 100).toFixed(2)) : 100;

    return {
      l1Entries: this.cache.size,
      maxL1Entries: this.maxEntries,
      hits: this.hits,
      staleHits: this.staleHits,
      misses: this.misses,
      coalescedRequests: this.coalescedRequests,
      backgroundRefreshes: this.backgroundRefreshes,
      hitRatioPct,
      circuits: Array.from(this.circuits.entries()).map(([provider, state]) => ({
        provider,
        state: state.state,
        consecutiveFailures: state.consecutiveFailures,
        openedAtMs: state.openedAtMs,
        lastError: state.lastError,
      })),
      lastAmfiSyncUtc: this.lastAmfiSyncUtc,
      uptimeSeconds: Math.floor((Date.now() - this.startedAtMs) / 1000),
    };
  }
}

export const marketApiGateway = new MarketApiGateway(2000);
