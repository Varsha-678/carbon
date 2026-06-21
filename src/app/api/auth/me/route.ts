import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod'
);

export async function GET(request: Request) {
  try {
    // Get cookies from request
    const token = request.headers.get('cookie')
      ?.split(';')
      .find((c) => c.trim().startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verify token
    let payload;
    try {
      const verified = await jose.jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const userId = payload.userId as string;

    // Fetch user from DB, including baseline and badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        baseline: true,
        badges: true,
        goals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        streakCount: user.streakCount,
        lastActiveDate: user.lastActiveDate,
        createdAt: user.createdAt,
        hasBaseline: !!user.baseline,
        baseline: user.baseline,
        badges: user.badges.map((b) => b.type),
        activeGoal: user.goals[0] || null,
      },
    });
  } catch (error) {
    console.error('Me API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
