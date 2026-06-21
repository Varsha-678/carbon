/**
 * Carbon Intensity Constants (kg CO2e per unit)
 */
export const CARBON_CONSTANTS = {
  // Transport emissions per km
  TRANSPORT: {
    car: 0.20,      // kg CO2e per km (average car)
    public: 0.05,   // kg CO2e per passenger km (bus/train)
    walk: 0.00,     // kg CO2e per km (walking/biking)
  },

  // Diet emissions per month (kg CO2e)
  DIET: {
    'high-meat': 600,   // Heavy meat consumer (daily red meat)
    'low-meat': 400,    // Flexitarian / poultry / low red meat
    vegetarian: 250,    // No meat, consumes dairy/eggs
    vegan: 150,         // Plant-based only
  },

  // Home energy (electricity) emissions per kWh
  ENERGY: {
    kwhMultiplier: 0.45, // kg CO2e per kWh
  },

  // Shopping / consumption emissions per month (kg CO2e)
  SHOPPING: {
    high: 300,   // Frequent buyer of new clothes, electronics, appliances
    medium: 175, // Moderate buyer, occasionally buys secondhand
    low: 75,     // Thrift buyer, repair-first, minimal consumption
  },

  // Savings per action unit
  ACTION_SAVINGS: {
    walk_instead_of_drive: 0.20, // kg CO2e saved per km walked/cycled instead of driven
    plant_based_meal: 1.50,      // kg CO2e saved per meat meal replaced
    air_dry_laundry: 1.35,       // kg CO2e saved per dryer load avoided
    lower_heating: 1.20,         // kg CO2e saved per day of thermostat turned down by 1.5°C
    recycle: 0.15,               // kg CO2e saved per item recycled (plastic/glass/metal)
  },
} as const;

/**
 * National and global monthly carbon footprint averages for comparison (kg CO2e / month)
 */
export const COMPARISON_AVERAGES = {
  global: 400,   // ~4.8 tonnes per year per capita
  national: 1300, // US average is ~16 tonnes per year (~1330 kg/month)
  target: 200,    // Sustainable target to limit warming to 1.5°C (~2.4 tonnes/year)
};

export type TransportType = keyof typeof CARBON_CONSTANTS.TRANSPORT;
export type DietType = keyof typeof CARBON_CONSTANTS.DIET;
export type ShoppingLevel = keyof typeof CARBON_CONSTANTS.SHOPPING;
export type ActionType = keyof typeof CARBON_CONSTANTS.ACTION_SAVINGS;

export interface FootprintBreakdown {
  transport: number;
  diet: number;
  energy: number;
  shopping: number;
  total: number;
}

/**
 * Calculates the baseline monthly carbon footprint (kg CO2e) based on onboarding responses.
 *
 * @param transportDistance - Monthly distance traveled in kilometers.
 * @param transportType - Main mode of transport ("car", "public", or "walk").
 * @param dietType - Type of diet ("vegan", "vegetarian", "low-meat", or "high-meat").
 * @param homeEnergyKwh - Monthly home electricity usage in kWh.
 * @param shoppingLevel - Consumption tier ("high", "medium", or "low").
 * @returns An object containing the breakdown by category and total monthly emissions.
 */
export function calculateBaselineFootprint(
  transportDistance: number,
  transportType: string,
  dietType: string,
  homeEnergyKwh: number,
  shoppingLevel: string
): FootprintBreakdown {
  // Validate inputs, fallback to sensible defaults or 0 if negative/invalid
  const safeDistance = Math.max(0, transportDistance);
  const safeEnergy = Math.max(0, homeEnergyKwh);

  const tType = (transportType in CARBON_CONSTANTS.TRANSPORT ? transportType : 'car') as TransportType;
  const dType = (dietType in CARBON_CONSTANTS.DIET ? dietType : 'low-meat') as DietType;
  const sLevel = (shoppingLevel in CARBON_CONSTANTS.SHOPPING ? shoppingLevel : 'medium') as ShoppingLevel;

  const transportEmissions = safeDistance * CARBON_CONSTANTS.TRANSPORT[tType];
  const dietEmissions = CARBON_CONSTANTS.DIET[dType];
  const energyEmissions = safeEnergy * CARBON_CONSTANTS.ENERGY.kwhMultiplier;
  const shoppingEmissions = CARBON_CONSTANTS.SHOPPING[sLevel];

  const total = transportEmissions + dietEmissions + energyEmissions + shoppingEmissions;

  return {
    transport: Math.round(transportEmissions * 100) / 100,
    diet: dietEmissions,
    energy: Math.round(energyEmissions * 100) / 100,
    shopping: shoppingEmissions,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Calculates carbon savings (kg CO2e) for a specific user action.
 *
 * @param actionType - The type of logged action.
 * @param value - The quantity associated with the action (e.g. km, number of meals).
 * @returns The total kg CO2e saved, rounded to two decimal places.
 */
export function calculateActionSavings(actionType: string, value: number): number {
  const safeValue = Math.max(0, value);
  const multiplier = actionType in CARBON_CONSTANTS.ACTION_SAVINGS
    ? CARBON_CONSTANTS.ACTION_SAVINGS[actionType as ActionType]
    : 0;

  return Math.round(safeValue * multiplier * 100) / 100;
}
