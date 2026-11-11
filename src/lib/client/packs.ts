'use client';

/**
 * Client content store: loads content packs (static JSON under /packs/v3/).
 *
 * The service worker caches packs cache-first, so these fetches are instant
 * after the first load and work fully offline. An in-memory cache makes
 * client-side navigation reuse the same promise.
 */

import type { CurriculumMap, Lesson, QuizQuestion } from '@/lib/content';

export interface RegistryLite {
  generatedAt: string;
  lessons: {
    id: string; moduleId: string; phaseId: string; title: string; estMinutes: number;
    difficulty: string; skills: string[]; prereqs: string[]; hasQuiz: boolean;
  }[];
}

export interface ProblemLite {
  slug: string; title: string; difficulty: string; category: string; tags: string[]; estMinutes: number;
  /** v3.2: varies by difficulty (30/50/80) so rewards read as real data */
  xp: number;
  /** v3.2: one-line pitch from the statement, fills the empty list middle */
  summary: string;
}

export interface AssessmentLite {
  id: string; title: string; kind: string; timeLimitMinutes: number; questionCount: number;
}

export interface ProjectLite {
  slug: string; title: string; order: number; difficulty: string; language: string;
}

export interface ProblemFull {
  slug: string; title: string; difficulty: string; category: string; tags: string[];
  statement: unknown[]; inputFormat: string; outputFormat: string; constraints: string[];
  examples: unknown[]; hints: string[]; editorial: unknown[]; solutions: unknown[];
  timeLimitMs: number; memoryLimitMb: number; estMinutes: number;
}

const BASE = '/packs/v3';
const packCache = new Map<string, Promise<unknown>>();

export function getPack<T>(url: string): Promise<T> {
  let p = packCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`pack ${url} failed: ${r.status}`);
      return r.json();
    });
    p.catch(() => packCache.delete(url));
    packCache.set(url, p);
  }
  return p as Promise<T>;
}

export function prefetch(url: string) {
  getPack(url).catch(() => {});
}

export const getLessonPack = (id: string) => getPack<Lesson>(`${BASE}/lessons/${id}.json`);
export const prefetchLesson = (id: string) => prefetch(`${BASE}/lessons/${id}.json`);
export const getMapPack = () => getPack<{ map: CurriculumMap; registry: RegistryLite }>(`${BASE}/map.json`);
export const getProblemsIndex = () => getPack<ProblemLite[]>(`${BASE}/problems/index.json`);
export const getProblemPack = (slug: string) => getPack<ProblemFull>(`${BASE}/problems/${slug}.json`);
export const getAssessmentsIndex = () => getPack<AssessmentLite[]>(`${BASE}/assessments/index.json`);
export const getProjectsIndex = () => getPack<ProjectLite[]>(`${BASE}/projects/index.json`);

export interface AssessmentFull {
  id: string; title: string; kind: string; timeLimitMinutes: number; description: string;
  areas: string[];
  sections: { title: string; questions: QuizQuestion[] }[];
}
export const getAssessmentPack = (id: string) => getPack<AssessmentFull>(`${BASE}/assessments/${id}.json`);

export interface Manifest {
  version: string; builtAt: string;
  counts: { lessons: number; problems: number; assessments: number; projects: number; companies: number };
  index: Record<string, string>;
  files: string[];
}
export const getManifest = () => getPack<Manifest>(`${BASE}/manifest.json`);
