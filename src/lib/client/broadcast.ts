'use client';

/**
 * Cross-tab synchronization channel with storage-event fallback.
 * Propagates auth sign-in/sign-out, study progress updates, planner updates,
 * and background offline pack completion instantaneously across open tabs.
 */

export type BroadcastTopic =
  | 'auth-changed'
  | 'state-changed'
  | 'offline-ready'
  | 'planner-changed'
  | 'projects-changed'
  | 'goal-changed';

export interface BroadcastPacket {
  topic: BroadcastTopic;
  payload?: unknown;
  at: number;
  sender: string;
}

const CHANNEL_NAME = 'qf-sync-bus';
const STORAGE_FALLBACK_KEY = 'qf-sync-bus-event';
const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2, 9)}`;

let ch: BroadcastChannel | null = null;
const handlers = new Set<(pkt: BroadcastPacket) => void>();
let initialized = false;

function dispatchLocal(pkt: BroadcastPacket) {
  if (pkt.sender === TAB_ID) return;
  for (const h of handlers) {
    try { h(pkt); } catch { /* ignore subscriber errors */ }
  }
}

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  if ('BroadcastChannel' in window) {
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (ev) => {
        if (ev.data && typeof ev.data === 'object' && 'topic' in ev.data) {
          dispatchLocal(ev.data as BroadcastPacket);
        }
      };
    } catch {
      ch = null;
    }
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key !== STORAGE_FALLBACK_KEY || !ev.newValue) return;
    try {
      const pkt = JSON.parse(ev.newValue) as BroadcastPacket;
      if (pkt && pkt.topic) dispatchLocal(pkt);
    } catch { /* ignore */ }
  });
}

export function broadcast(topic: BroadcastTopic, payload?: unknown): void {
  if (typeof window === 'undefined') return;
  ensureInit();
  const pkt: BroadcastPacket = { topic, payload, at: Date.now(), sender: TAB_ID };
  if (ch) {
    try { ch.postMessage(pkt); } catch { /* ignore */ }
  }
  try {
    window.localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(pkt));
  } catch { /* ignore */ }
}

export function onBroadcast(fn: (pkt: BroadcastPacket) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  ensureInit();
  handlers.add(fn);
  return () => { handlers.delete(fn); };
}
