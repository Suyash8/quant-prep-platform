/**
 * Curriculum graph: pure, isomorphic.
 *
 * Built from the curriculum map + registry (both available server-side from
 * content/ and client-side from the /packs/v3/map.json content pack), so the
 * client can compute unlocks and "next lesson" without a server round trip.
 */

import type { CurriculumMap } from '@/lib/content';

export interface LessonNode {
  id: string; moduleId: string; phaseId: string; phaseTitle: string; moduleTitle: string;
  title: string; estMinutes: number; difficulty: string; skills: string[]; prereqs: string[];
  tracks: string[]; published: boolean;
}

export interface RegistryEntry {
  id: string; moduleId: string; phaseId: string; title: string; estMinutes: number;
  difficulty: string; skills: string[]; prereqs: string[]; hasQuiz: boolean;
}

export interface CurriculumGraph {
  nodes: LessonNode[];
  byId: Map<string, LessonNode>;
  order: string[];
}

export function buildCurriculumGraph(map: CurriculumMap, registryLessons: RegistryEntry[]): CurriculumGraph {
  const published = new Set(registryLessons.map(l => l.id));
  const regById = new Map(registryLessons.map(l => [l.id, l]));
  const byId = new Map<string, LessonNode>();
  const nodes: LessonNode[] = [];
  for (const ph of map.phases) {
    for (const m of ph.modules) {
      for (const l of m.lessons) {
        const node: LessonNode = {
          id: l.id, moduleId: m.id, phaseId: ph.id, phaseTitle: ph.title, moduleTitle: m.title,
          title: l.title, estMinutes: l.estMinutes, difficulty: (l as { difficulty?: string }).difficulty ?? 'core', skills: l.skills,
          prereqs: regById.get(l.id)?.prereqs?.filter(p => p !== l.id) ?? [],
          tracks: m.tracks, published: published.has(l.id),
        };
        byId.set(l.id, node);
        nodes.push(node);
      }
    }
  }
  // sequential fallback within a module when no explicit prereqs exist
  for (const m of map.phases.flatMap(p => p.modules)) {
    for (let i = 0; i < m.lessons.length; i++) {
      const node = byId.get(m.lessons[i].id)!;
      if (i > 0 && !node.prereqs.length) node.prereqs = [m.lessons[i - 1].id];
    }
    // drop prereqs that don't exist (stale references)
    for (const l of m.lessons) {
      const node = byId.get(l.id)!;
      node.prereqs = node.prereqs.filter(p => byId.has(p) && p !== l.id);
    }
  }
  // topological order
  const order: string[] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string) => {
    const st = state.get(id) ?? 0;
    if (st === 2) return;
    if (st === 1) return; // cycle guard
    state.set(id, 1);
    for (const p of byId.get(id)?.prereqs ?? []) visit(p);
    state.set(id, 2);
    order.push(id);
  };
  for (const n of nodes) visit(n.id);
  return { nodes, byId, order };
}

export function isUnlockedInGraph(graph: CurriculumGraph, lessonId: string, done: Set<string>): boolean {
  const node = graph.byId.get(lessonId);
  if (!node) return false;
  return node.prereqs.every(p => done.has(p));
}
