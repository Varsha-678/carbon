import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const goalSchema = z.object({
  targetReductionPercent: z.number().min(1, 'Target must be at least 1%').max(90, 'Target cannot exceed 90%'),
  durationDays: z.number().int().min(7, 'Duration must be at least 7 days').max(365, 'Duration cannot exceed 1 year'),
});

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's baseline footprint
    const baseline = await prisma.baseline.findUnique({
      where: { userId },
    });

    // Fetch active goal
    let goal = await prisma.goal.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!goal) {
      return NextResponse.json({ goal: null, progress: null });
    }

    if (!baseline) {
      return NextResponse.json({
        goal,
        progress: {
          percent: 0,
          targetSavingsKg: 0,
          actualSavingsKg: 0,
          error: 'Please complete onboarding questionnaire first.',
        },
      });
    }

    const now = new Date();
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);

    // Calculate actual savings during the goal timeframe
    const savingsAgg = await prisma.actionLog.aggregate({
      where: {
        userId,
        loggedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        co2Saved: true,
      },
    });

    const actualSavingsKg = savingsAgg._sum.co2Saved || 0;

    // Calculate target savings. Baseline is monthly (30 days). 
    // We adjust the baseline to the goal duration.
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const proportionalBaseline = (baseline.calculatedBaseline / 30) * durationDays;
    const targetSavingsKg = (proportionalBaseline * goal.targetReductionPercent) / 100;

    let progressPercent = targetSavingsKg > 0 ? (actualSavingsKg / targetSavingsKg) * 100 : 0;
    progressPercent = Math.min(100, Math.round(progressPercent * 10) / 10);

    // Check if goal has expired
    if (now > endDate) {
      const isSuccess = actualSavingsKg >= targetSavingsKg;
      const finalStatus = isSuccess ? 'COMPLETED' : 'FAILED';

      // Update goal status
      goal = await prisma.goal.update({
        where: { id: goal.id },
        data: { status: finalStatus },
      });

      // Award badge if completed
      if (isSuccess) {
        try {
          await prisma.badge.create({
            data: {
              userId,
              type: 'GOAL_GETTER',
            },
          });
        } catch {
          // Ignore unique constraint error
        }
      }
    }

    return NextResponse.json({
      goal,
      progress: {
        percent: progressPercent,
        targetSavingsKg: Math.round(targetSavingsKg * 10) / 10,
        actualSavingsKg: Math.round(actualSavingsKg * 10) / 10,
        isExpired: now > endDate,
        success: actualSavingsKg >= targetSavingsKg,
      },
    });
  } catch (error) {
    console.error('Get Goal error:', error);
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
    const result = goalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { targetReductionPercent, durationDays } = result.data;

    // Check if user has baseline footprint
    const baseline = await prisma.baseline.findUnique({
      where: { userId },
    });

    if (!baseline) {
      return NextResponse.json(
        { error: 'Baseline not found. Please complete onboarding questionnaire first.' },
        { status: 400 }
      );
    }

    // Cancel any currently active goals
    await prisma.goal.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'FAILED' }, // Mark old active goals as failed/cancelled
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationDays);

    const goal = await prisma.goal.create({
      data: {
        userId,
        targetReductionPercent,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      message: 'New goal set successfully',
      goal,
    });
  } catch (error) {
    console.error('Post Goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
