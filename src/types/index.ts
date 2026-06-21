export interface User {
  id: string;
  email: string;
  name: string;
  streakCount: number;
  lastActiveDate: string | null;
  createdAt: string;
  hasBaseline: boolean;
  baseline: Baseline | null;
  badges: string[];
  activeGoal: Goal | null;
}

export interface Baseline {
  id: string;
  userId: string;
  transportDistance: number;
  transportType: 'car' | 'public' | 'walk';
  dietType: 'vegan' | 'vegetarian' | 'low-meat' | 'high-meat';
  homeEnergyKwh: number;
  shoppingLevel: 'high' | 'medium' | 'low';
  calculatedBaseline: number;
  createdAt: string;
}

export interface ActionLog {
  id: string;
  userId: string;
  actionType: 'walk_instead_of_drive' | 'plant_based_meal' | 'air_dry_laundry' | 'lower_heating' | 'recycle';
  category: 'transport' | 'diet' | 'energy' | 'shopping';
  value: number;
  co2Saved: number;
  loggedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  targetReductionPercent: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface GoalProgress {
  percent: number;
  targetSavingsKg: number;
  actualSavingsKg: number;
  isExpired: boolean;
  success: boolean;
  error?: string;
}

export interface Tip {
  id: string;
  title: string;
  description: string;
  savings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  actionType: string;
}

export interface InsightsResponse {
  highestCategory: 'transport' | 'diet' | 'energy' | 'shopping' | null;
  highestCategoryLabel: string | null;
  highestCategoryValue: number | null;
  tips: Tip[];
  message: string;
}
