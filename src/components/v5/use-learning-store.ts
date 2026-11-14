'use client';
import { useSyncExternalStore,useCallback } from 'react';
import type { V5Store,StoreSnapshot } from '@/lib/v5/types';
/** Adapter snapshots need referential stability until subscribeState reports a change. */
export function useLearningStore(store:V5Store){return useSyncExternalStore(useCallback(fn=>store.subscribeState(fn),[store]),useCallback(()=>store.getSnapshot(),[store]),useCallback(()=>store.getSnapshot(),[store]));}
export function packProgress(packs:StoreSnapshot['packs']){const {stored,total,state}=packs;return total>0?state==='complete'&&stored===total?100:Math.min(99,Math.max(0,Math.floor(stored/total*100))):0;}
