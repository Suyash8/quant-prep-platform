import type { Block, Lesson } from '@/lib/content';

/**
 * Lesson → card deck segmentation.
 *
 * Pure, isomorphic (server and client safe): turns a lesson document into a
 * Duolingo-style sequence of bite-sized cards, one concept per screen, labs
 * and tables on their own cards, one quiz question per card.
 *
 * This module must stay dependency-free so it can be unit tested and used in
 * both the server page and the client player.
 */

export interface SafeQuestion {
  id: string;
  type: 'mcq' | 'ms' | 'numeric' | 'short' | 'code-output';
  prompt: string;
  options?: string[];
  code?: string;
  language?: string;
  unit?: string;
}

export type PlayerCard =
  | {
      kind: 'intro'; title: string; motivation: string; objectives: string[];
      estMinutes: number; difficulty: string; skills: string[];
    }
  | { kind: 'concept'; title: string; blocks: Block[] }
  | { kind: 'lab'; title: string; block: Extract<Block, { type: 'interactive' }> }
  | {
      kind: 'exercise'; title: string; exKind: 'guided' | 'independent';
      prompt: string; hints: string[]; solution: string;
      snippet?: boolean; file?: string; requires?: string[]; successCheck?: string;
    }
  | { kind: 'quiz'; title: string; question: SafeQuestion; index: number; total: number }
  | { kind: 'mistakes'; title: string; items: string[] }
  | { kind: 'reality'; title: string; realWorld?: string; quant?: string }
  | { kind: 'summary'; title: string; items: string[]; flashcardCount: number };

/** Rough reading weight of a block, used to decide when a card is "full". */
function blockWeight(b: Block): number {
  switch (b.type) {
    case 'p': return b.md.length;
    case 'h2': case 'h3': return 40;
    case 'math': return b.tex.length / 2;
    case 'code': return b.code.length / 3;
    case 'callout': return b.md.length;
    case 'list': return b.items.join('').length;
    case 'table': return b.rows.flat().join('').length / 2;
    case 'steps': return b.items.join('').length;
    case 'interactive': return 9999; // always its own card


    case 'ref': return 60;
  }
}

const CARD_CHAR_LIMIT = 850;

/** Strip answer material from a quiz question before it reaches the browser. */
export function safeQuestion(q: Lesson['quiz'][number]): SafeQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    code: q.code,
    language: q.language,
    unit: (q as { unit?: string }).unit,
  };
}

export function buildLessonCards(lesson: Lesson): PlayerCard[] {
  const cards: PlayerCard[] = [];

  cards.push({
    kind: 'intro',
    title: lesson.title,
    motivation: lesson.motivation,
    objectives: lesson.objectives,
    estMinutes: lesson.estMinutes,
    difficulty: lesson.difficulty,
    skills: lesson.skills,
  });

  let current: { title: string; blocks: Block[]; weight: number } | null = null;

  const flush = () => {
    if (current && current.blocks.length > 0) {
      cards.push({ kind: 'concept', title: current.title, blocks: current.blocks });
    }
    current = null;
  };

  const ensureCurrent = (title?: string) => {
    if (!current) current = { title: title ?? '', blocks: [], weight: 0 };
    else if (title && !current.title) current.title = title;
  };

  for (const block of lesson.blocks) {
    const w = blockWeight(block);
    switch (block.type) {
      case 'h2':
        flush();
        current = { title: block.text, blocks: [], weight: 0 };
        break;
      case 'h3':
        ensureCurrent();
        current!.blocks.push(block);
        current!.weight += w;
        break;
      case 'interactive':
        flush();
        cards.push({ kind: 'lab', title: block.caption ?? '', block });
        break;
      case 'table':
        flush();
        cards.push({ kind: 'concept', title: '', blocks: [block] });
        break;
      case 'code':
        // Code sticks with a following explanation? Keep it standalone for focus.


        flush();
        cards.push({ kind: 'concept', title: '', blocks: [block] });
        break;
      case 'ref':
        // References stay in reference mode; skipped in the card flow.


        break;
      default: {
        // p, math, callout, list, steps, accumulate into the current concept.


        ensureCurrent();
        if (current!.weight + w > CARD_CHAR_LIMIT && current!.blocks.length > 0) {
          flush();
          ensureCurrent(current?.title);
          current!.title = ''; // continuation card keeps its own identity quiet


        }
        current!.blocks.push(block);
        current!.weight += w;
        break;
      }
    }
  }
  flush();

  cards.push({
    kind: 'exercise',
    title: 'Guided exercise',
    exKind: 'guided',
    prompt: lesson.guidedExercise.prompt,
    hints: lesson.guidedExercise.hints,
    solution: lesson.guidedExercise.solution,
    snippet: lesson.guidedExercise.snippet,
    file: lesson.guidedExercise.file,
    requires: lesson.guidedExercise.requires,
    successCheck: lesson.guidedExercise.successCheck,
  });
  cards.push({
    kind: 'exercise',
    title: 'Your turn, independent exercise',
    exKind: 'independent',
    prompt: lesson.independentExercise.prompt,
    hints: lesson.independentExercise.hints,
    solution: lesson.independentExercise.solution,
    snippet: lesson.independentExercise.snippet,
    file: lesson.independentExercise.file,
    requires: lesson.independentExercise.requires,
    successCheck: lesson.independentExercise.successCheck,
  });

  lesson.quiz.forEach((q, i) => {
    cards.push({ kind: 'quiz', title: `Question ${i + 1}`, question: safeQuestion(q), index: i, total: lesson.quiz.length });
  });

  if (lesson.commonMistakes.length > 0) {
    cards.push({ kind: 'mistakes', title: 'Common mistakes', items: lesson.commonMistakes });
  }
  if (lesson.realWorldApplication || lesson.quantFinanceApplication) {
    cards.push({
      kind: 'reality',
      title: 'Where you will use this',
      realWorld: lesson.realWorldApplication,
      quant: lesson.quantFinanceApplication,
    });
  }
  cards.push({ kind: 'summary', title: 'Wrap-up', items: lesson.summary, flashcardCount: lesson.flashcards.length });

  return cards;
}

/** Small helpers for the player UI. */
export function cardLabel(card: PlayerCard): string {
  switch (card.kind) {
    case 'intro': return 'Introduction';
    case 'concept': return 'Concept';
    case 'lab': return 'Interactive lab';
    case 'exercise': return 'Exercise';
    case 'quiz': return 'Knowledge check';
    case 'mistakes': return 'Watch out';
    case 'reality': return 'In the real world';
    case 'summary': return 'Summary';
  }
}
