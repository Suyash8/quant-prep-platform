'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Building2, Code2, Compass, FolderKanban, Gauge, Layers,
  RotateCcw, Settings, Timer, Trophy,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  getAssessmentsIndex, getCompaniesPack, getMapPack, getProblemsIndex,
  type AssessmentLite, type CompanyFull, type ProblemLite, type RegistryLite,
} from '@/lib/client/packs';

const NAV_PAGES = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge, keywords: 'home path today' },
  { label: 'Curriculum', href: '/curriculum', icon: Compass, keywords: 'phases modules lessons' },
  { label: 'Code Practice', href: '/practice', icon: Code2, keywords: 'cpp python problems ide' },
  { label: 'Revision Queue', href: '/revision', icon: RotateCcw, keywords: 'flashcards sm2 spaced repetition' },
  { label: 'Mental Math Drills', href: '/drills', icon: Timer, keywords: 'arithmetic speed' },
  { label: 'Assessments', href: '/assessments', icon: Trophy, keywords: 'diagnostic screening' },
  { label: 'Portfolio Projects', href: '/projects', icon: FolderKanban, keywords: 'capstones' },
  { label: 'Career Explorer', href: '/career', icon: Building2, keywords: 'firms jane street citadel' },
  { label: 'Settings', href: '/settings', icon: Settings, keywords: 'account security export' },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [lessons, setLessons] = React.useState<RegistryLite['lessons']>([]);
  const [problems, setProblems] = React.useState<ProblemLite[]>([]);
  const [companies, setCompanies] = React.useState<CompanyFull[]>([]);
  const [assessments, setAssessments] = React.useState<AssessmentLite[]>([]);
  const loadedRef = React.useRef(false);

  const visibleLessons = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessons.slice(0, 80);
    return lessons
      .filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.skills.some((s) => s.toLowerCase().includes(q)),
      )
      .slice(0, 80);
  }, [lessons, query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenEvt = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('qf:command-open', onOpenEvt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('qf:command-open', onOpenEvt);
    };
  }, []);

  React.useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    void Promise.allSettled([
      getMapPack().then((m) => setLessons(m.registry.lessons ?? [])),
      getProblemsIndex().then((p) => setProblems(p)),
      getCompaniesPack().then((c) => setCompanies(c.companies ?? [])),
      getAssessmentsIndex().then((a) => setAssessments(a)),
    ]);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search QuantFoundry"
      description="Jump to lessons, coding problems, career profiles, or pages."
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Jump to a lesson, problem, firm, or page… (Esc to close)"
      />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>No matching lessons, problems, or pages.</CommandEmpty>
        <CommandGroup heading="Pages">
          {NAV_PAGES.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.href} value={`${p.label} ${p.keywords}`} onSelect={() => go(p.href)}>
                <Icon className="h-4 w-4 text-accent" />
                <span>{p.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        {lessons.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Lessons (${lessons.length})`}>
              {visibleLessons.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lesson ${l.title} ${l.skills.join(' ')}`}
                  onSelect={() => go(`/learn/${l.id}`)}
                >
                  <BookOpen className="h-4 w-4 text-info" />
                  <span className="truncate flex-1">{l.title}</span>
                  <span className="text-[11px] text-faint capitalize">{l.difficulty}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {problems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Coding Problems">
              {problems.map((p) => (
                <CommandItem
                  key={p.slug}
                  value={`problem ${p.title} ${p.category} ${p.tags.join(' ')}`}
                  onSelect={() => go(`/practice/${p.slug}`)}
                >
                  <Code2 className="h-4 w-4 text-violet" />
                  <span className="truncate flex-1">{p.title}</span>
                  <span className="text-[11px] text-faint capitalize">{p.difficulty}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {companies.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Firms & Career Profiles">
              {companies.map((c) => (
                <CommandItem
                  key={c.slug}
                  value={`firm ${c.name} ${c.category}`}
                  onSelect={() => go(`/career/${c.slug}`)}
                >
                  <Building2 className="h-4 w-4 text-warning" />
                  <span className="truncate flex-1">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {assessments.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Assessments">
              {assessments.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`assessment ${a.title} ${a.kind}`}
                  onSelect={() => go(`/assessments/${a.id}`)}
                >
                  <Layers className="h-4 w-4 text-accent" />
                  <span className="truncate flex-1">{a.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
