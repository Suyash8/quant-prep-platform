import 'server-only';
import fs from 'fs';
import path from 'path';
import { buildCurriculumGraph, type LessonNode } from '@/lib/curriculum-graph';

export type { LessonNode } from '@/lib/curriculum-graph';

const CONTENT_DIR = path.join(process.cwd(), 'content');

// In dev, content files change under the running server; bypass the caches so


// edits are picked up without a manual recompile. Production keeps the caches.


const DEV = process.env.NODE_ENV !== 'production';

// ---------- cached loaders ----------


let mapCache: CurriculumMap | null = null;
let registryCache: Registry | null = null;
const lessonCache = new Map<string, Lesson>();
let graphCache: ReturnType<typeof buildCurriculumGraph> | null = null;

export interface CurriculumMap {
  version: string;
  skills: string[];
  phases: {
    id: string; order: number; title: string; summary: string; color: string;
    modules: {
      id: string; title: string; difficulty: string; tracks: string[]; summary: string;
      lessons: { id: string; title: string; estMinutes: number; skills: string[] }[];
    }[];
  }[];
  tracks: Record<string, { title: string; employers: string; focus: string }>;
}

export interface Lesson {
  id: string; moduleId: string; title: string; estMinutes: number; difficulty: string;
  prereqs: string[]; objectives: string[]; motivation: string;
  blocks: Block[];
  guidedExercise: { prompt: string; hints: string[]; solution: string };
  independentExercise: { prompt: string; hints: string[]; solution: string };
  commonMistakes: string[];
  realWorldApplication?: string;
  quantFinanceApplication?: string;
  summary: string[];
  quiz: QuizQuestion[];
  flashcards: { type: string; front: string; back: string }[];
  references?: { label: string; url: string }[];
  skills: string[];
}

export type Block =
  | { type: 'p'; md: string }
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'math'; tex: string; caption?: string }
  | { type: 'code'; lang: string; code: string; caption?: string }
  | { type: 'callout'; variant: string; title: string; md: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'interactive'; component: string; params: Record<string, unknown>; caption?: string }
  | { type: 'ref'; items: { label: string; url: string }[] };

export type QuizQuestion = {
  id: string; type: 'mcq' | 'ms' | 'numeric' | 'short' | 'code-output';
  prompt: string;
  options?: string[];
  answerIndex?: number;
  answerIndices?: number[];
  answer?: number;
  tolerance?: number;
  modelAnswer?: string;
  keywords?: string[];
  code?: string;
  language?: string;
  explanation: string;
};

export interface Registry {
  generatedAt: string;
  lessons: {
    id: string; moduleId: string; phaseId: string; title: string; estMinutes: number;
    difficulty: string; skills: string[]; prereqs: string[]; hasQuiz: boolean;
  }[];
}

export function getMap(): CurriculumMap {
  if (mapCache === null || DEV) {
    const parsed: CurriculumMap = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'map', 'curriculum.json'), 'utf8'));
    mapCache = parsed;
  }
  return mapCache;
}

export function getRegistry(): Registry {
  if (fs.existsSync(path.join(CONTENT_DIR, 'registry.json'))) {
    if (registryCache === null || DEV) {
      const parsed: Registry = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'registry.json'), 'utf8'));
      registryCache = parsed;
    }
    return registryCache;
  }
  // fallback: build on the fly


  const map = getMap();
  const lessons: Registry['lessons'] = [];
  for (const ph of map.phases) {
    for (const m of ph.modules) {
      for (const l of m.lessons) {
        const p = path.join(CONTENT_DIR, 'lessons', m.id, `${l.id}.json`);
        if (fs.existsSync(p)) {
          lessons.push({ id: l.id, moduleId: m.id, phaseId: ph.id, title: l.title, estMinutes: l.estMinutes, difficulty: (l as { difficulty?: string }).difficulty ?? 'core', skills: l.skills, prereqs: [], hasQuiz: true });
        }
      }
    }
  }
  return { generatedAt: new Date().toISOString(), lessons };
}

export function lessonPath(moduleId: string, id: string): string {
  return path.join(CONTENT_DIR, 'lessons', moduleId, `${id}.json`);
}

export function getLesson(moduleId: string, id: string): Lesson | null {
  const key = `${moduleId}/${id}`;
  if (!DEV && lessonCache.has(key)) return lessonCache.get(key)!;
  const p = lessonPath(moduleId, id);
  if (!fs.existsSync(p)) return null;
  const L = JSON.parse(fs.readFileSync(p, 'utf8')) as Lesson;
  lessonCache.set(key, L);
  return L;
}

export function getLessonById(id: string): { lesson: Lesson; moduleId: string } | null {
  const map = getMap();
  for (const ph of map.phases) {
    for (const m of ph.modules) {
      if (m.lessons.some(l => l.id === id)) {
        const L = getLesson(m.id, id);
        if (L) return { lesson: L, moduleId: m.id };
      }
    }
  }
  return null;
}

// ---------- problems ----------


export interface Problem {
  slug: string; title: string; difficulty: 'easy' | 'medium' | 'hard'; category: string;
  tags: string[]; statement: Block[]; inputFormat: string; outputFormat: string;
  constraints: string[]; examples: { input: string; output: string; explanation?: string }[];
  hints: string[]; editorial: Block[];
  solutions: Record<string, string>;
  tests: { input: string; expected: string; hidden?: boolean }[];
  timeLimitMs: number; memoryLimitMb: number; estMinutes: number;
}

export function listProblems(): { slug: string; title: string; difficulty: string; category: string; tags: string[]; estMinutes: number }[] {
  const dir = path.join(CONTENT_DIR, 'problems');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const P = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Problem;
    return { slug: P.slug, title: P.title, difficulty: P.difficulty, category: P.category, tags: P.tags, estMinutes: P.estMinutes };
  }).sort((a, b) => a.title.localeCompare(b.title));
}

const problemCache = new Map<string, Problem>();
export function getProblem(slug: string): Problem | null {
  if (problemCache.has(slug)) return problemCache.get(slug)!;
  const p = path.join(CONTENT_DIR, 'problems', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  const P = JSON.parse(fs.readFileSync(p, 'utf8')) as Problem;
  problemCache.set(slug, P);
  return P;
}

// ---------- assessments ----------


export interface Assessment {
  id: string; title: string; kind: 'diagnostic' | 'assessment' | 'interview' | 'screening';
  timeLimitMinutes: number; description: string; areas?: string[];
  sections: { title: string; questions: QuizQuestion[] }[];
}

export function listAssessments(): { id: string; title: string; kind: string; timeLimitMinutes: number; questionCount: number; description: string }[] {
  const dir = path.join(CONTENT_DIR, 'assessments');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const A = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Assessment;
    return { id: A.id, title: A.title, kind: A.kind, timeLimitMinutes: A.timeLimitMinutes, questionCount: A.sections.reduce((n, s) => n + s.questions.length, 0), description: A.description };
  });
}

export function getAssessment(id: string): Assessment | null {
  const p = path.join(CONTENT_DIR, 'assessments', `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Assessment;
}

// ---------- projects ----------


export interface Project {
  slug: string; order: number; title: string; language: string; difficulty: string;
  prereqLessons: string[]; context: string; problem: string; requirements: string[];
  milestones: { title: string; detail: string; estHours: number }[];
  designGuidance: Block[];
  starterFiles: { path: string; content: string }[];
  evaluationCriteria: { criterion: string; weight: number }[];
  documentationRequirements: string[];
  extensionChallenges: string[];
}

export function listProjects(): { slug: string; title: string; order: number; difficulty: string; language: string }[] {
  const dir = path.join(CONTENT_DIR, 'projects');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const P = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Project;
    return { slug: P.slug, title: P.title, order: P.order, difficulty: P.difficulty, language: P.language };
  }).sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | null {
  const p = path.join(CONTENT_DIR, 'projects', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Project;
}

// ---------- companies ----------


export interface Company {
  slug: string; name: string; category: string;
  roles: { title: string; track: string; notes: string }[];
  publishedExpectations: { claim: string; sourceUrl: string; retrievedAt: string; confidence: string }[];
  competencyAreas: string[]; prepModules: string[]; prepAssessments: string[]; notes: string;
}

export function listCompanies(): { slug: string; name: string; category: string }[] {
  const dir = path.join(CONTENT_DIR, 'companies');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => {
    const C = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Company;
    return { slug: C.slug, name: C.name, category: C.category };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCompany(slug: string): Company | null {
  const p = path.join(CONTENT_DIR, 'companies', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Company;
}

export function getMatrix(): { generatedAt: string; tiers: string[]; rows: { skill: string; assetManagers: string; banks: string; propTrading: string; hedgeFunds: string; marketData: string; note: string }[] } | null {
  const p = path.join(CONTENT_DIR, 'companies', '_matrix.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ---------- prerequisite graph / curriculum helpers ----------


export function getCurriculumGraph(): { nodes: LessonNode[]; byId: Map<string, LessonNode>; order: string[] } {
  if (graphCache === null || DEV) {
    graphCache = buildCurriculumGraph(getMap(), getRegistry().lessons);
  }
  return graphCache;
}

export function isUnlocked(lessonId: string, done: Set<string>): boolean {
  const { byId } = getCurriculumGraph();
  const node = byId.get(lessonId);
  if (!node) return false;
  return node.prereqs.every(p => done.has(p));
}

// Phase color tokens for the design system


export const PHASE_COLORS: Record<string, string> = {
  orientation: '#64748b', math: '#1d4ed8', cs: '#0f766e', python: '#15803d',
  cpp: '#9f1239', dsa: '#7c2d12', aptitude: '#a16207', finance: '#166534',
  stats: '#6d28d9', pricing: '#1e40af', systems: '#334155',
};
