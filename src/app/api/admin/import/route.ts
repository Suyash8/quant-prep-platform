import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const schema = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9._-]+\.json$/, 'filename must be a safe .json name'),
  content: z.string().min(10).max(2_000_000),
});

const DEST_MAP: { prefix: string; dir: string }[] = [
  { prefix: 'diag-', dir: 'assessments' },
  { prefix: 'assess-', dir: 'assessments' },
  { prefix: 'apt-', dir: 'assessments' },
  { prefix: 'interview-', dir: 'assessments' },
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admins only.' }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid import.' }, { status: 400 });
  const { filename, content } = parsed.data;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(content);
  } catch (e) {
    return NextResponse.json({ error: `Invalid JSON: ${(e as Error).message}` }, { status: 400 });
  }

  // route by explicit kind field or known prefixes


  let destDir: string | null = null;
  const kind = obj.kind as string | undefined;
  if (obj.tests && obj.solutions) destDir = 'problems';
  else if (obj.milestones) destDir = 'projects';
  else if (obj.sections && (kind === 'diagnostic' || kind === 'assessment' || kind === 'interview' || kind === 'screening')) destDir = 'assessments';
  else if (obj.publishedExpectations) destDir = 'companies';
  else if (obj.moduleId && obj.blocks) destDir = 'lessons';
  else {
    const hit = DEST_MAP.find(d => filename.startsWith(d.prefix));
    if (hit) destDir = hit.dir;
  }
  if (!destDir) {
    return NextResponse.json({ error: 'Could not determine content type. File must match one of the documented schemas (lesson/problem/assessment/project/company).' }, { status: 400 });
  }

  const target = path.join(process.cwd(), 'content', destDir, filename);
  try {
    await writeFile(target, JSON.stringify(obj, null, 2), 'utf8');
    return NextResponse.json({ ok: true, message: `Imported to content/${destDir}/${filename}. Validation report refreshed.` });
  } catch (e) {
    return NextResponse.json({ error: `Write failed: ${(e as Error).message}` }, { status: 500 });
  }
}
