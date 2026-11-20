import { NextResponse } from 'next/server';
import { getCurrentUser, currentSessionTag } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        timezone: user.timezone,
        emailVerified: Boolean(user.emailVerifiedAt),
        streakFreezes: user.streakFreezes,
        onboardingDone: user.onboardingDone,
        targetTrack: user.targetTrack,
      },
      st: await currentSessionTag(),
    });
  } catch {
    return NextResponse.json({ user: null, unavailable: true }, { status: 503 });
  }
}
