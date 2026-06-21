import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateActionSavings } from '@/utils/carbon';
import { z } from 'zod';

const actionTypesMapping = {
  walk_instead_of_drive: 'transport',
  plant_based_meal: 'diet',
  air_dry_laundry: 'energy',
  lower_heating: 'energy',
  recycle: 'shopping',
} as const;

const logSchema = z.object({
  actionType: z.enum(['walk_instead_of_drive', 'plant_based_meal', 'air_dry_laundry', 'lower_heating', 'recycle']),
  value: z.number().positive('Value must be greater than zero'),
  notes: z.string().max(140, 'Notes must be 140 characters or less').optional(),
});

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const category = searchParams.get('category') || undefined;
    const filter = category ? { userId, category } : { userId };

    const [logs, totalCount] = await Promise.all([
      prisma.actionLog.findMany({
        where: filter,
        orderBy: { loggedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.actionLog.count({ where: filter }),
    ]);

    // Calculate cumulative savings
    const totalSavingsAgg = await prisma.actionLog.aggregate({
      where: { userId },
      _sum: {
        co2Saved: true,
      },
    });

    const totalSavings = totalSavingsAgg._sum.co2Saved || 0;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
      totalSavings: Math.round(totalSavings * 100) / 100,
    });
  } catch (error) {
    console.error('Get Logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = logSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { actionType, value, notes } = result.data;
    const category = actionTypesMapping[actionType];
    const co2Saved = calculateActionSavings(actionType, value);

    // Save action log
    const log = await prisma.actionLog.create({
      data: {
        userId,
        actionType,
        category,
        value,
        co2Saved,
        notes: notes || null,
      },
    });

    // Update streak and badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { badges: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let newStreak = user.streakCount;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastActive.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      // If diffDays === 0, keep current streak (already logged today)
    } else {
      newStreak = 1;
    }

    // Update user streak and activity date
    await prisma.user.update({
      where: { id: userId },
      data: {
        streakCount: newStreak,
        lastActiveDate: new Date(),
      },
    });

    // Check & Award Gamified Badges
    const existingBadgeTypes = new Set((user.badges || []).map((b) => b.type));
    const unlockedBadges: string[] = [];

    const awardBadge = async (badgeName: string) => {
      if (existingBadgeTypes.has(badgeName)) return;
      try {
        const badge = await prisma.badge.create({
          data: { userId, type: badgeName },
        });
        unlockedBadges.push(badge.type);
        existingBadgeTypes.add(badgeName);
      } catch {
        // Safe to ignore
      }
    };

    // Streak-based badges
    if (newStreak >= 3) await awardBadge('STREAK_3');
    if (newStreak >= 7) await awardBadge('STREAK_7');

    // Count action logs per category to award activity badges
    const categoryCounts = await prisma.actionLog.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    });

    const dietCount = categoryCounts.find((c) => c.category === 'diet')?._count || 0;
    const transportCount = categoryCounts.find((c) => c.category === 'transport')?._count || 0;

    if (dietCount >= 5) await awardBadge('PLANT_POWERED');
    if (transportCount >= 5) await awardBadge('ECO_WALKER');

    // Cumulative carbon saved check
    const totalSavedAgg = await prisma.actionLog.aggregate({
      where: { userId },
      _sum: { co2Saved: true },
    });
    const cumulativeSaved = totalSavedAgg._sum.co2Saved || 0;

    if (cumulativeSaved >= 50) await awardBadge('CARBON_CLIPPER');
    if (cumulativeSaved >= 200) await awardBadge('ECO_WARRIOR');

    return NextResponse.json({
      message: 'Action logged successfully',
      log,
      streakCount: newStreak,
      co2Saved,
      unlockedBadges,
    });
  } catch (error) {
    console.error('Post Log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
