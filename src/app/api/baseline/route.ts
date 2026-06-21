import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateBaselineFootprint } from '@/utils/carbon';
import { z } from 'zod';

const baselineSchema = z.object({
  transportDistance: z.number().nonnegative('Distance must be non-negative'),
  transportType: z.enum(['car', 'public', 'walk']),
  dietType: z.enum(['vegan', 'vegetarian', 'low-meat', 'high-meat']),
  homeEnergyKwh: z.number().nonnegative('Energy must be non-negative'),
  shoppingLevel: z.enum(['high', 'medium', 'low']),
});

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseline = await prisma.baseline.findUnique({
      where: { userId },
    });

    if (!baseline) {
      return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
    }

    return NextResponse.json({ baseline });
  } catch (error) {
    console.error('Get Baseline error:', error);
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
    const result = baselineSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { transportDistance, transportType, dietType, homeEnergyKwh, shoppingLevel } = result.data;

    // Calculate baseline
    const breakdown = calculateBaselineFootprint(
      transportDistance,
      transportType,
      dietType,
      homeEnergyKwh,
      shoppingLevel
    );

    // Upsert baseline in DB
    const baseline = await prisma.baseline.upsert({
      where: { userId },
      update: {
        transportDistance,
        transportType,
        dietType,
        homeEnergyKwh,
        shoppingLevel,
        calculatedBaseline: breakdown.total,
      },
      create: {
        userId,
        transportDistance,
        transportType,
        dietType,
        homeEnergyKwh,
        shoppingLevel,
        calculatedBaseline: breakdown.total,
      },
    });

    // Award "Understand" baseline completion badge if not already unlocked
    const badgeType = 'BASELINE_COMPLETED';
    const existingBadge = await prisma.badge.findUnique({
      where: {
        userId_type: {
          userId,
          type: badgeType,
        },
      },
    });

    if (!existingBadge) {
      await prisma.badge.create({
        data: {
          userId,
          type: badgeType,
        },
      });
    }

    return NextResponse.json({
      message: 'Baseline saved successfully',
      baseline,
      breakdown,
      badgeUnlocked: !existingBadge ? badgeType : null,
    });
  } catch (error) {
    console.error('Post Baseline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
