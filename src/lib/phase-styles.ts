import type * as React from 'react';
import {
  Sigma, TrendingUp, Code2, Cpu, BrainCircuit, Compass, Percent,
  Database, Layers, Binary, Puzzle, Coins,
} from 'lucide-react';

const PHASE_ICON_BY_KEY: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  orientation: Compass,
  math: Sigma,
  cs: Binary,
  python: Code2,
  cpp: Cpu,
  dsa: BrainCircuit,
  aptitude: Puzzle,
  finance: TrendingUp,
  stats: Percent,
  pricing: Coins,
  systems: Database,
};

const PHASE_ICON_BY_TITLE: { match: RegExp; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { match: /orient|diagnostic/i, icon: Compass },
  { match: /math/i, icon: Sigma },
  { match: /computer science|fundamental/i, icon: Binary },
  { match: /python|programming/i, icon: Code2 },
  { match: /c\+\+/i, icon: Cpu },
  { match: /data structure|algorithm/i, icon: BrainCircuit },
  { match: /aptitude|logic/i, icon: Puzzle },
  { match: /finance|market|trading|risk/i, icon: TrendingUp },
  { match: /statistic|time series|modelling/i, icon: Percent },
  { match: /pricing|numerical/i, icon: Coins },
  { match: /system|network|engineering/i, icon: Database },
];

export function phaseIcon(colorOrTitle: string) {
  const byKey = PHASE_ICON_BY_KEY[colorOrTitle];
  if (byKey) return byKey;
  return PHASE_ICON_BY_TITLE.find(p => p.match.test(colorOrTitle))?.icon ?? Layers;
}

/** plural helper, kills the "1 modules · 5 Lessons" wobble */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export const PHASE_PALETTE: Record<string, string> = {
  orientation: '#5f6f8c',
  math: '#1e9e4f',
  cs: '#7c3fd6',
  python: '#0284c7',
  cpp: '#0369a1',
  dsa: '#7c3fd6',
  aptitude: '#7c3fd6',
  finance: '#dd3d43',
  stats: '#1e9e4f',
  pricing: '#1e9e4f',
  systems: '#0891b2',
};

export const PHASE_FAMILY: Record<string, string> = {
  orientation: 'Onboarding',
  math: 'Mathematics',
  stats: 'Mathematics',
  pricing: 'Mathematics',
  cs: 'Computer science',
  dsa: 'Computer science',
  aptitude: 'Computer science',
  python: 'Programming',
  cpp: 'Programming',
  finance: 'Markets',
  systems: 'Engineering',
};

export function resolvePhaseColor(colorKey: string): string {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorKey)) return colorKey;
  return PHASE_PALETTE[colorKey] ?? '#34c759';
}
