import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CARBON_CONSTANTS } from '@/utils/carbon';

interface Tip {
  id: string;
  title: string;
  description: string;
  savings: number; // monthly kg CO2e saved
  difficulty: 'Easy' | 'Medium' | 'Hard';
  actionType: string;
}

const TIPS_BY_CATEGORY: Record<string, Tip[]> = {
  transport: [
    {
      id: 't_switch_transit',
      title: 'Commute via Public Transit',
      description: 'Switch from driving to taking the bus or train for your daily commute. Even doing this 3 days a week makes a massive dent.',
      savings: 50.0,
      difficulty: 'Medium',
      actionType: 'walk_instead_of_drive', // Mapping to logger action
    },
    {
      id: 't_carpool',
      title: 'Start Carpooling',
      description: 'Share commutes with colleagues or friends. Halving your solo driving time halves your transport footprint.',
      savings: 40.0,
      difficulty: 'Easy',
      actionType: 'walk_instead_of_drive',
    },
    {
      id: 't_active_transit',
      title: 'Active Commutes (Bike/Walk)',
      description: 'Use a bicycle or walk for all short trips under 3 km instead of using your car. Excellent for fitness and the climate!',
      savings: 25.0,
      difficulty: 'Medium',
      actionType: 'walk_instead_of_drive',
    },
    {
      id: 't_steady_driving',
      title: 'Eco-Driving Habits',
      description: 'Avoid rapid acceleration and hard braking. Maintaining steady highway speeds saves fuel and cuts emissions by up to 15%.',
      savings: 10.0,
      difficulty: 'Easy',
      actionType: 'walk_instead_of_drive',
    },
  ],
  diet: [
    {
      id: 'd_vegan_days',
      title: 'Try Vegan Days',
      description: 'Go 100% plant-based 3 days a week. Vegan meals produce up to 75% fewer greenhouse gases than meat-heavy meals.',
      savings: 45.0,
      difficulty: 'Medium',
      actionType: 'plant_based_meal',
    },
    {
      id: 'd_replace_beef',
      title: 'Swap Beef for Chicken or Fish',
      description: 'Beef has a carbon footprint 8x higher than chicken. Swapping red meat for poultry or fish makes a quick, high-impact change.',
      savings: 35.0,
      difficulty: 'Easy',
      actionType: 'plant_based_meal',
    },
    {
      id: 'd_meatless_mondays',
      title: 'Join Meatless Mondays',
      description: 'Commit to eating vegetarian every Monday. Eliminating meat for just one day a week saves significant emissions.',
      savings: 15.0,
      difficulty: 'Easy',
      actionType: 'plant_based_meal',
    },
    {
      id: 'd_prevent_waste',
      title: 'Zero Food Waste',
      description: 'Plan meals, shop with a list, and freeze leftovers. Food waste in landfills produces highly potent methane gas.',
      savings: 12.0,
      difficulty: 'Easy',
      actionType: 'plant_based_meal',
    },
  ],
  energy: [
    {
      id: 'e_air_dry',
      title: 'Air-Dry Your Laundry',
      description: 'Ditch the electric clothes dryer and use a drying rack or clothesline. Air-drying is gentler on clothes and uses zero energy.',
      savings: 22.0,
      difficulty: 'Easy',
      actionType: 'air_dry_laundry',
    },
    {
      id: 'e_lower_temp',
      title: 'Optimize Thermostat Settings',
      description: 'Lower your winter heating by 1.5°C and raise your summer AC by 1.5°C. You will barely feel the difference, but your footprint will shrink.',
      savings: 18.0,
      difficulty: 'Easy',
      actionType: 'lower_heating',
    },
    {
      id: 'e_led_swap',
      title: 'Upgrade to LED Bulbs',
      description: 'Replace remaining incandescent bulbs with energy-efficient LEDs, which consume 75% less electricity and last 25x longer.',
      savings: 8.0,
      difficulty: 'Easy',
      actionType: 'lower_heating',
    },
    {
      id: 'e_phantom_power',
      title: 'Vanquish Phantom Loads',
      description: 'Unplug chargers, entertainment systems, and appliances when away. "Vampire power" accounts for 5-10% of home electricity use.',
      savings: 6.0,
      difficulty: 'Easy',
      actionType: 'lower_heating',
    },
  ],
  shopping: [
    {
      id: 's_secondhand',
      title: 'Buy Clothes Secondhand',
      description: 'Thrift or swap instead of buying fast fashion. The fashion industry accounts for 10% of global carbon emissions.',
      savings: 30.0,
      difficulty: 'Easy',
      actionType: 'recycle',
    },
    {
      id: 's_refurbished',
      title: 'Choose Refurbished Tech',
      description: 'Buy certified refurbished smartphones or laptops. Reusing existing electronics prevents massive manufacturing emissions.',
      savings: 25.0,
      difficulty: 'Medium',
      actionType: 'recycle',
    },
    {
      id: 's_repair_first',
      title: 'Adopt a Repair-First Mindset',
      description: 'Stitch torn clothes, glue broken plastic, or repair appliances. Keeping products in use longer reduces production demand.',
      savings: 15.0,
      difficulty: 'Medium',
      actionType: 'recycle',
    },
    {
      id: 's_recycle_properly',
      title: 'Strict Recycling Habits',
      description: 'Set up separate bins and recycle glass, metals, and clean paper. Aluminum recycling saves 95% of the energy needed to make new cans.',
      savings: 8.0,
      difficulty: 'Easy',
      actionType: 'recycle',
    },
  ],
};

const DEFAULT_TIPS: Tip[] = [
  {
    id: 'g_walk',
    title: 'Walk and Bike More',
    description: 'Avoid driving for short-distance trips under 2 km.',
    savings: 20.0,
    difficulty: 'Easy',
    actionType: 'walk_instead_of_drive',
  },
  {
    id: 'g_meatless',
    title: 'Eat Meat-Free Meals',
    description: 'Reduce meat consumption by substituting beans, lentils, or tofu.',
    savings: 18.0,
    difficulty: 'Easy',
    actionType: 'plant_based_meal',
  },
  {
    id: 'g_dryer',
    title: 'Avoid the Clothes Dryer',
    description: 'Air-dry your clothes when possible.',
    savings: 15.0,
    difficulty: 'Easy',
    actionType: 'air_dry_laundry',
  },
];

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
      return NextResponse.json({
        highestCategory: null,
        tips: DEFAULT_TIPS,
        message: 'Complete the onboarding survey to receive personalized insights.',
      });
    }

    // Re-calculate category breakdowns to find highest contributor
    // (This ensures consistency with carbon constants)
    const transportVal = baseline.transportDistance * CARBON_CONSTANTS.TRANSPORT[baseline.transportType as keyof typeof CARBON_CONSTANTS.TRANSPORT];
    const dietVal = CARBON_CONSTANTS.DIET[baseline.dietType as keyof typeof CARBON_CONSTANTS.DIET];
    const energyVal = baseline.homeEnergyKwh * CARBON_CONSTANTS.ENERGY.kwhMultiplier;
    const shoppingVal = CARBON_CONSTANTS.SHOPPING[baseline.shoppingLevel as keyof typeof CARBON_CONSTANTS.SHOPPING];

    const categories = [
      { name: 'transport', value: transportVal, label: 'Transportation' },
      { name: 'diet', value: dietVal, label: 'Diet & Food' },
      { name: 'energy', value: energyVal, label: 'Home Energy' },
      { name: 'shopping', value: shoppingVal, label: 'Shopping & Consumption' },
    ];

    // Find the category with the highest emission value
    const highestCategoryObj = categories.reduce((prev, current) =>
      prev.value > current.value ? prev : current
    );

    const highestCategory = highestCategoryObj.name;
    const highestCategoryLabel = highestCategoryObj.label;

    // Get tips for the highest category, ranked by savings (descending)
    const primaryTips = TIPS_BY_CATEGORY[highestCategory] || [];
    
    // Supplement with 1-2 tips from other secondary highest categories to make it 4 tips
    const otherCategories = categories
      .filter((c) => c.name !== highestCategory)
      .sort((a, b) => b.value - a.value);

    const secondaryTips: Tip[] = [];
    if (otherCategories.length > 0) {
      const secondCat = otherCategories[0].name;
      const tipsFromSecond = TIPS_BY_CATEGORY[secondCat] || [];
      if (tipsFromSecond.length > 0) {
        secondaryTips.push(tipsFromSecond[0]);
      }
    }
    if (otherCategories.length > 1) {
      const thirdCat = otherCategories[1].name;
      const tipsFromThird = TIPS_BY_CATEGORY[thirdCat] || [];
      if (tipsFromThird.length > 0) {
        secondaryTips.push(tipsFromThird[0]);
      }
    }

    // Combine tips and sort by impact (kg saved)
    const personalizedTips = [...primaryTips.slice(0, 3), ...secondaryTips]
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5); // top 3-5 tips

    return NextResponse.json({
      highestCategory,
      highestCategoryLabel,
      highestCategoryValue: Math.round(highestCategoryObj.value * 10) / 10,
      tips: personalizedTips,
      message: `Your highest carbon source is **${highestCategoryLabel}** (${Math.round(highestCategoryObj.value)} kg CO2e/month). Focusing on these tips will yield the highest emission reductions.`,
    });
  } catch (error) {
    console.error('Get Insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
