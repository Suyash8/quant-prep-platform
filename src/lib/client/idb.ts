'use client';

/**
 * Durable client-side IndexedDB store (with in-memory/localStorage safe guards).
 * Stores multi-language code drafts, lesson reading positions, study notes,
 * planner state, and project milestone progress for zero-latency offline UX.
 */

const DB_NAME = 'quantfoundry-db';
const DB_VERSION = 1;

export interface DraftRecord {
  key: string; // `${slug}:${lang}`
  slug: string;
  lang: string;
  code: string;
  updatedAt: number;
  prevCode?: string;
  prevAt?: number;
}

export interface LessonPositionRecord {
  lessonId: string;
  cardIndex: number;
  scrollY: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('positions')) db.createObjectStore('positions', { keyPath: 'lessonId' });
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getDraft(slug: string, lang: string): Promise<DraftRecord | null> {
  return withStore<DraftRecord>('drafts', 'readonly', (s) => s.get(`${slug}:${lang}`));
}

export async function saveDraft(
  slug: string,
  lang: string,
  code: string,
  preservePrevious = true,
): Promise<DraftRecord | null> {
  const key = `${slug}:${lang}`;
  const existing = await getDraft(slug, lang);
  // Preserve an older meaningful snapshot when current code changes significantly
  const preservePrev =
    preservePrevious &&
    existing &&
    existing.code !== code &&
    Math.abs(existing.code.length - code.length) > 12;
  const record: DraftRecord = {
    key,
    slug,
    lang,
    code,
    updatedAt: Date.now(),
    prevCode: preservePrev ? existing.code : existing?.prevCode,
    prevAt: preservePrev ? existing.updatedAt : existing?.prevAt,
  };
  await withStore('drafts', 'readwrite', (s) => s.put(record));
  return record;
}

export async function getLessonPosition(lessonId: string): Promise<LessonPositionRecord | null> {
  return withStore<LessonPositionRecord>('positions', 'readonly', (s) => s.get(lessonId));
}

export async function saveLessonPosition(lessonId: string, cardIndex: number, scrollY = 0): Promise<void> {
  const record: LessonPositionRecord = { lessonId, cardIndex, scrollY, updatedAt: Date.now() };
  await withStore('positions', 'readwrite', (s) => s.put(record));
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const res = await withStore<T>('kv', 'readonly', (s) => s.get(key));
  return res ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await withStore('kv', 'readwrite', (s) => s.put(value, key));
}
