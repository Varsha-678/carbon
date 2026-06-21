import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch top 5 users by streak count
    const streakLeaderboard = await prisma.user.findMany({
      orderBy: { streakCount: 'desc' },
      select: { id: true, name: true, streakCount: true },
      take: 5,
    });

    // 2. Fetch top 5 users by total carbon savings (group logs by userId)
    const savingsGroup = await prisma.actionLog.groupBy({
      by: ['userId'],
      _sum: {
        co2Saved: true,
      },
      orderBy: {
        _sum: {
          co2Saved: 'desc',
        },
      },
      take: 5,
    });

    // Resolve user names for the savings leaderboard
    const savingsLeaderboard = await Promise.all(
      savingsGroup.map(async (group) => {
        const user = await prisma.user.findUnique({
          where: { id: group.userId },
          select: { name: true },
        });
        return {
          id: group.userId,
          name: user?.name || 'Anonymous Eco Warrior',
          totalSaved: Math.round((group._sum.co2Saved || 0) * 10) / 10,
        };
      })
    );

    // 3. Fetch recent 10 logged actions across the platform for feed (anonymized first name)
    const recentLogs = await prisma.actionLog.findMany({
      orderBy: { loggedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const recentActivity = recentLogs.map((log) => {
      const firstName = log.user.name.split(' ')[0] || 'Someone';
      return {
        id: log.id,
        userName: firstName,
        actionType: log.actionType,
        category: log.category,
        co2Saved: log.co2Saved,
        loggedAt: log.loggedAt,
      };
    });

    // 4. Calculate total carbon saved collectively by everyone
    const collectiveSavingsAgg = await prisma.actionLog.aggregate({
      _sum: {
        co2Saved: true,
      },
    });

    const collectiveSavings = Math.round((collectiveSavingsAgg._sum.co2Saved || 0) * 10) / 10;

    return NextResponse.json({
      leaderboard: {
        streaks: streakLeaderboard.map(u => ({ id: u.id, name: u.name, streakCount: u.streakCount })),
        savings: savingsLeaderboard,
      },
      recentActivity,
      collectiveSavings,
    });
  } catch (error) {
    console.error('Get Community Data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
