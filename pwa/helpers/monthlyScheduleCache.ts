type MonthlyScheduleCacheIdentity = {
    year: number;
    month: number;
    positionKey: string;
};

type MonthlyScheduleCacheEntry = {
    key: string;
    year: number;
    month: number;
    positionKey: string;
    payload: any;
    signature: string;
    resourceId: string;
    cachedAt: number;
    expiresAt: number;
};

type MonthlyScheduleCacheSetInput = {
    identity: MonthlyScheduleCacheIdentity;
    payload: any;
    signature?: string;
    ttlMs?: number;
    resourceId?: string;
};

type PreviousMonthBalanceCacheIdentity = {
    year: number;
    month: number;
    positionKey: string;
};

type PreviousMonthBalanceCacheEntry = {
    key: string;
    year: number;
    month: number;
    positionKey: string;
    label: string;
    status: 'found' | 'missing';
    balanceByEmployee: Record<string, number>;
    cachedAt: number;
    expiresAt: number;
};

type ShiftScheduleMapsCacheEntry = {
    key: string;
    scheduleRef: string;
    workedMap: Record<string, number>;
    nightMap: Record<string, number>;
    cachedAt: number;
    expiresAt: number;
};

const DB_NAME = 'trans-schedule-cache';
const DB_VERSION = 2;
const MONTHLY_STORE_NAME = 'monthly-schedules';
const PREVIOUS_BALANCE_STORE_NAME = 'previous-month-balances';
const SHIFT_SCHEDULE_STORE_NAME = 'shift-schedule-maps';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const isClient = () => typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const normalizeMonth = (month: number) => {
    if (!Number.isFinite(month)) return 1;
    return Math.min(12, Math.max(1, Math.trunc(month)));
};

const normalizeYear = (year: number) => {
    if (!Number.isFinite(year)) return 1970;
    return Math.trunc(year);
};

const toMonthIndex = (year: number, month: number) => normalizeYear(year) * 12 + (normalizeMonth(month) - 1);

const fromMonthIndex = (index: number) => {
    const safe = Math.trunc(index);
    const year = Math.floor(safe / 12);
    const month = (safe % 12 + 12) % 12 + 1;
    return { year, month };
};

export const toPositionCacheKey = (position: unknown): string => {
    if (position === null || position === undefined) return '';

    if (typeof position === 'string') {
        const trimmed = position.trim();
        if (!trimmed) return '';

        const iriMatch = trimmed.match(/\/(\d+)$/);
        if (iriMatch?.[1]) {
            return iriMatch[1];
        }

        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) {
            return String(Math.trunc(numeric));
        }

        return trimmed;
    }

    if (typeof position === 'number') {
        if (!Number.isFinite(position)) return '';
        return String(Math.trunc(position));
    }

    if (typeof position === 'object') {
        const p = position as Record<string, unknown>;
        if (typeof p.id === 'number' && Number.isFinite(p.id)) {
            return String(Math.trunc(p.id));
        }
        if (typeof p.id === 'string') {
            const nested = toPositionCacheKey(p.id);
            if (nested) return nested;
        }
        if (typeof p['@id'] === 'string') {
            const nested = toPositionCacheKey(p['@id']);
            if (nested) return nested;
        }
    }

    return '';
};

export const buildMonthlyScheduleCacheKey = (identity: MonthlyScheduleCacheIdentity): string => {
    const year = normalizeYear(identity.year);
    const month = normalizeMonth(identity.month);
    const positionKey = String(identity.positionKey || '').trim();
    return `${year}-${String(month).padStart(2, '0')}-${positionKey}`;
};

const openDatabase = async (): Promise<IDBDatabase | null> => {
    if (!isClient()) return null;

    if (!dbPromise) {
        dbPromise = new Promise((resolve) => {
            try {
                const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(MONTHLY_STORE_NAME)) {
                        db.createObjectStore(MONTHLY_STORE_NAME, { keyPath: 'key' });
                    }
                    if (!db.objectStoreNames.contains(PREVIOUS_BALANCE_STORE_NAME)) {
                        db.createObjectStore(PREVIOUS_BALANCE_STORE_NAME, { keyPath: 'key' });
                    }
                    if (!db.objectStoreNames.contains(SHIFT_SCHEDULE_STORE_NAME)) {
                        db.createObjectStore(SHIFT_SCHEDULE_STORE_NAME, { keyPath: 'key' });
                    }
                };

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.warn('IndexedDB open failed for monthly schedule cache', request.error);
                    resolve(null);
                };
            } catch (error) {
                console.warn('IndexedDB unavailable for monthly schedule cache', error);
                resolve(null);
            }
        });
    }

    return dbPromise;
};

const runReadonly = async <T,>(
    storeName: string,
    work: (store: IDBObjectStore, resolve: (value: T) => void) => void,
    fallback: T
): Promise<T> => {
    const db = await openDatabase();
    if (!db) return fallback;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            work(store, resolve);

            tx.onerror = () => resolve(fallback);
        } catch {
            resolve(fallback);
        }
    });
};

const runReadwrite = async (
    storeName: string,
    work: (store: IDBObjectStore, resolve: () => void) => void
): Promise<void> => {
    const db = await openDatabase();
    if (!db) return;

    await new Promise<void>((resolve) => {
        try {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            work(store, resolve);

            tx.onerror = () => resolve();
            tx.oncomplete = () => resolve();
        } catch {
            resolve();
        }
    });
};

export const getMonthlyScheduleCache = async (
    identity: MonthlyScheduleCacheIdentity,
    now: number = Date.now()
): Promise<MonthlyScheduleCacheEntry | null> => {
    const key = buildMonthlyScheduleCacheKey(identity);

    const entry = await runReadonly<MonthlyScheduleCacheEntry | null>(MONTHLY_STORE_NAME, (store, resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve((request.result || null) as MonthlyScheduleCacheEntry | null);
        request.onerror = () => resolve(null);
    }, null);

    if (!entry) return null;

    if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
        void deleteMonthlyScheduleCache(identity);
        return null;
    }

    return entry;
};

export const setMonthlyScheduleCache = async ({
    identity,
    payload,
    signature = '',
    ttlMs = 24 * 60 * 60 * 1000,
    resourceId,
}: MonthlyScheduleCacheSetInput): Promise<void> => {
    const key = buildMonthlyScheduleCacheKey(identity);
    const now = Date.now();

    const entry: MonthlyScheduleCacheEntry = {
        key,
        year: normalizeYear(identity.year),
        month: normalizeMonth(identity.month),
        positionKey: String(identity.positionKey || '').trim(),
        payload,
        signature,
        resourceId: String(resourceId || ''),
        cachedAt: now,
        expiresAt: now + Math.max(1, Math.trunc(ttlMs)),
    };

    await runReadwrite(MONTHLY_STORE_NAME, (store, resolve) => {
        store.put(entry);
        resolve();
    });
};

export const deleteMonthlyScheduleCache = async (identity: MonthlyScheduleCacheIdentity): Promise<void> => {
    const key = buildMonthlyScheduleCacheKey(identity);

    await runReadwrite(MONTHLY_STORE_NAME, (store, resolve) => {
        store.delete(key);
        resolve();
    });
};

export const markMonthlyScheduleCacheStale = async (identity: MonthlyScheduleCacheIdentity): Promise<void> => {
    const existing = await runReadonly<MonthlyScheduleCacheEntry | null>(MONTHLY_STORE_NAME, (store, resolve) => {
        const request = store.get(buildMonthlyScheduleCacheKey(identity));
        request.onsuccess = () => resolve((request.result || null) as MonthlyScheduleCacheEntry | null);
        request.onerror = () => resolve(null);
    }, null);

    if (!existing) return;

    await runReadwrite(MONTHLY_STORE_NAME, (store, resolve) => {
        store.put({ ...existing, expiresAt: Date.now() - 1 });
        resolve();
    });
};

export const buildMonthWindow = (
    center: MonthlyScheduleCacheIdentity,
    radius: number
): MonthlyScheduleCacheIdentity[] => {
    const safeRadius = Math.max(0, Math.trunc(radius));
    const baseIndex = toMonthIndex(center.year, center.month);
    const out: MonthlyScheduleCacheIdentity[] = [];

    for (let delta = -safeRadius; delta <= safeRadius; delta++) {
        const { year, month } = fromMonthIndex(baseIndex + delta);
        out.push({
            year,
            month,
            positionKey: center.positionKey,
        });
    }

    return out;
};

export const cleanupMonthlyScheduleCacheWindow = async (
    center: MonthlyScheduleCacheIdentity,
    radius: number
): Promise<void> => {
    const keepKeys = new Set(buildMonthWindow(center, radius).map(buildMonthlyScheduleCacheKey));

    const entries = await runReadonly<MonthlyScheduleCacheEntry[]>(MONTHLY_STORE_NAME, (store, resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result || []) as MonthlyScheduleCacheEntry[]);
        request.onerror = () => resolve([]);
    }, []);

    if (!entries.length) return;

    const toDelete = entries
        .filter((entry) => entry.positionKey === center.positionKey && !keepKeys.has(entry.key))
        .map((entry) => entry.key);

    if (!toDelete.length) return;

    await runReadwrite(MONTHLY_STORE_NAME, (store, resolve) => {
        toDelete.forEach((key) => store.delete(key));
        resolve();
    });
};

const buildPreviousMonthBalanceCacheKey = (identity: PreviousMonthBalanceCacheIdentity): string => {
    const year = normalizeYear(identity.year);
    const month = normalizeMonth(identity.month);
    const positionKey = String(identity.positionKey || '').trim();
    return `${year}-${String(month).padStart(2, '0')}-${positionKey}`;
};

export const getPreviousMonthBalanceCache = async (
    identity: PreviousMonthBalanceCacheIdentity,
    now: number = Date.now()
): Promise<PreviousMonthBalanceCacheEntry | null> => {
    const key = buildPreviousMonthBalanceCacheKey(identity);

    const entry = await runReadonly<PreviousMonthBalanceCacheEntry | null>(PREVIOUS_BALANCE_STORE_NAME, (store, resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve((request.result || null) as PreviousMonthBalanceCacheEntry | null);
        request.onerror = () => resolve(null);
    }, null);

    if (!entry) return null;

    if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
        await runReadwrite(PREVIOUS_BALANCE_STORE_NAME, (store, resolve) => {
            store.delete(key);
            resolve();
        });
        return null;
    }

    return entry;
};

export const setPreviousMonthBalanceCache = async (
    entryInput: Omit<PreviousMonthBalanceCacheEntry, 'key' | 'cachedAt' | 'expiresAt'> & { ttlMs?: number }
): Promise<void> => {
    const key = buildPreviousMonthBalanceCacheKey(entryInput);
    const now = Date.now();
    const ttlMs = Math.max(1, Math.trunc(entryInput.ttlMs ?? 24 * 60 * 60 * 1000));

    const entry: PreviousMonthBalanceCacheEntry = {
        key,
        year: normalizeYear(entryInput.year),
        month: normalizeMonth(entryInput.month),
        positionKey: String(entryInput.positionKey || '').trim(),
        label: String(entryInput.label || ''),
        status: entryInput.status,
        balanceByEmployee: entryInput.balanceByEmployee || {},
        cachedAt: now,
        expiresAt: now + ttlMs,
    };

    await runReadwrite(PREVIOUS_BALANCE_STORE_NAME, (store, resolve) => {
        store.put(entry);
        resolve();
    });
};

const buildShiftScheduleCacheKey = (scheduleRef: string): string => String(scheduleRef || '').trim();

export const getShiftScheduleMapsCache = async (
    scheduleRef: string,
    now: number = Date.now()
): Promise<ShiftScheduleMapsCacheEntry | null> => {
    const key = buildShiftScheduleCacheKey(scheduleRef);
    if (!key) return null;

    const entry = await runReadonly<ShiftScheduleMapsCacheEntry | null>(SHIFT_SCHEDULE_STORE_NAME, (store, resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve((request.result || null) as ShiftScheduleMapsCacheEntry | null);
        request.onerror = () => resolve(null);
    }, null);

    if (!entry) return null;

    if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
        await runReadwrite(SHIFT_SCHEDULE_STORE_NAME, (store, resolve) => {
            store.delete(key);
            resolve();
        });
        return null;
    }

    return entry;
};

export const setShiftScheduleMapsCache = async (
    scheduleRef: string,
    workedMap: Record<string, number>,
    nightMap: Record<string, number>,
    ttlMs: number = 24 * 60 * 60 * 1000
): Promise<void> => {
    const key = buildShiftScheduleCacheKey(scheduleRef);
    if (!key) return;

    const now = Date.now();
    const entry: ShiftScheduleMapsCacheEntry = {
        key,
        scheduleRef: key,
        workedMap: workedMap || {},
        nightMap: nightMap || {},
        cachedAt: now,
        expiresAt: now + Math.max(1, Math.trunc(ttlMs)),
    };

    await runReadwrite(SHIFT_SCHEDULE_STORE_NAME, (store, resolve) => {
        store.put(entry);
        resolve();
    });
};

export type {
    MonthlyScheduleCacheIdentity,
    MonthlyScheduleCacheEntry,
    PreviousMonthBalanceCacheIdentity,
    PreviousMonthBalanceCacheEntry,
    ShiftScheduleMapsCacheEntry,
};
