import { describe, it, expect } from 'vitest';
import { calculateBaselineFootprint, calculateActionSavings } from './carbon';

describe('Carbon Baseline Calculations', () => {
  it('should calculate correct values for standard inputs', () => {
    // Distance: 500km via car (500 * 0.2 = 100)
    // Diet: low-meat (400)
    // Energy: 200 kWh (200 * 0.45 = 90)
    // Shopping: medium (175)
    // Total = 100 + 400 + 90 + 175 = 765
    const result = calculateBaselineFootprint(500, 'car', 'low-meat', 200, 'medium');
    expect(result.transport).toBe(100);
    expect(result.diet).toBe(400);
    expect(result.energy).toBe(90);
    expect(result.shopping).toBe(175);
    expect(result.total).toBe(765);
  });

  it('should handle zero distance and zero energy inputs', () => {
    const result = calculateBaselineFootprint(0, 'walk', 'vegan', 0, 'low');
    expect(result.transport).toBe(0);
    expect(result.diet).toBe(150);
    expect(result.energy).toBe(0);
    expect(result.shopping).toBe(75);
    expect(result.total).toBe(225);
  });

  it('should handle negative values by boundary pinning to zero', () => {
    const result = calculateBaselineFootprint(-100, 'public', 'vegetarian', -50, 'low');
    expect(result.transport).toBe(0);
    expect(result.diet).toBe(250);
    expect(result.energy).toBe(0);
    expect(result.shopping).toBe(75);
    expect(result.total).toBe(325);
  });

  it('should handle extremely high/extreme inputs', () => {
    const result = calculateBaselineFootprint(999999, 'car', 'high-meat', 999999, 'high');
    expect(result.transport).toBe(199999.8);
    expect(result.diet).toBe(600);
    expect(result.energy).toBe(449999.55);
    expect(result.shopping).toBe(300);
    expect(result.total).toBe(650899.35);
  });

  it('should fallback to default options if invalid keys are provided', () => {
    // invalid-transport -> defaults to 'car' (0.20)
    // invalid-diet -> defaults to 'low-meat' (400)
    // invalid-shopping -> defaults to 'medium' (175)
    const result = calculateBaselineFootprint(100, 'invalid-transport', 'invalid-diet', 100, 'invalid-shopping');
    expect(result.transport).toBe(20);
    expect(result.diet).toBe(400);
    expect(result.energy).toBe(45);
    expect(result.shopping).toBe(175);
    expect(result.total).toBe(640);
  });
});

describe('Action Savings Calculations', () => {
  it('should calculate correct savings for each action type', () => {
    expect(calculateActionSavings('walk_instead_of_drive', 10)).toBe(2.0); // 10 * 0.2
    expect(calculateActionSavings('plant_based_meal', 3)).toBe(4.5); // 3 * 1.5
    expect(calculateActionSavings('air_dry_laundry', 2)).toBe(2.7); // 2 * 1.35
    expect(calculateActionSavings('lower_heating', 5)).toBe(6.0); // 5 * 1.2
    expect(calculateActionSavings('recycle', 10)).toBe(1.5); // 10 * 0.15
  });

  it('should return 0 for unknown action types', () => {
    expect(calculateActionSavings('unknown_action', 10)).toBe(0);
  });

  it('should return 0 for negative action quantities', () => {
    expect(calculateActionSavings('plant_based_meal', -5)).toBe(0);
  });
});
