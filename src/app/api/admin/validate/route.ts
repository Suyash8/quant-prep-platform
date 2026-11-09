import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runContentValidation } from '@/lib/admin-validate';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  const report = await runContentValidation();
  return NextResponse.json(report);
}
