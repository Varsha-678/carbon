'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Compass,
  Flame,
  Award,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Target,
  Sparkles,
  Info,
  Loader2,
  CheckCircle,
  HelpCircle,
  Footprints,
  Coffee,
  Sun,
  Thermometer,
  RotateCcw,
  Users,
  Download,
  Filter,
  Activity
} from 'lucide-react';
import { ActionLog, Goal, GoalProgress, InsightsResponse } from '@/types';

// Constants matching our utils/carbon
const ACTION_DETAILS = {
  walk_instead_of_drive: { label: 'Walked/Cycled instead of drove', unit: 'km', icon: Footprints, category: 'transport', baseSaving: 0.20 },
  plant_based_meal: { label: 'Ate a plant-based meal', unit: 'meals', icon: Coffee, category: 'diet', baseSaving: 1.50 },
  air_dry_laundry: { label: 'Air-dried a load of laundry', unit: 'loads', icon: Sun, category: 'energy', baseSaving: 1.35 },
  lower_heating: { label: 'Lowered home heating/thermostat', unit: 'days', icon: Thermometer, category: 'energy', baseSaving: 1.20 },
  recycle: { label: 'Recycled items properly', unit: 'items', icon: RotateCcw, category: 'shopping', baseSaving: 0.15 },
};

const BADGE_INFO = {
  BASELINE_COMPLETED: { name: 'Baseline Pioneer', desc: 'Established initial carbon baseline footprint.', color: 'from-blue-600 to-indigo-600' },
  STREAK_3: { name: 'Eco Habit', desc: 'Logged green actions for 3 days in a row.', color: 'from-amber-500 to-orange-600' },
  STREAK_7: { name: 'Green Devotee', desc: 'Logged green actions for 7 days in a row.', color: 'from-yellow-500 to-amber-600' },
  PLANT_POWERED: { name: 'Plant Champion', desc: 'Logged at least 5 plant-based meals.', color: 'from-emerald-500 to-green-600' },
  ECO_WALKER: { name: 'Active Commuter', desc: 'Logged 5 active transportation actions.', color: 'from-teal-500 to-emerald-600' },
  CARBON_CLIPPER: { name: 'Carbon Clipper', desc: 'Saved a cumulative 50 kg of CO2e.', color: 'from-cyan-500 to-blue-600' },
  ECO_WARRIOR: { name: 'Eco Warrior', desc: 'Saved a cumulative 200 kg of CO2e.', color: 'from-purple-600 to-indigo-700' },
  GOAL_GETTER: { name: 'Goal Overachiever', desc: 'Completed an active carbon reduction goal.', color: 'from-fuchsia-600 to-pink-600' },
};

interface LeaderboardUser {
  id: string;
  name: string;
  streakCount?: number;
  totalSaved?: number;
}

interface ActivityItem {
  id: string;
  userName: string;
  actionType: string;
  category: string;
  co2Saved: number;
  loggedAt: string;
}

interface CommunityData {
  leaderboard: {
    streaks: LeaderboardUser[];
    savings: LeaderboardUser[];
  };
  recentActivity: ActivityItem[];
  collectiveSavings: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const router = useRouter();

  // Navigation check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (!authLoading && user && !user.hasBaseline) {
      router.push('/onboarding');
    }
  }, [user, authLoading, router]);

  // Tab state: "me" or "community"
  const [activeTab, setActiveTab] = useState<'me' | 'community'>('me');

  // UI state
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [totalSavings, setTotalSavings] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Goal state
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [goalLoading, setGoalLoading] = useState(false);
  
  // Goal setter form state
  const [targetReduction, setTargetReduction] = useState(10);
  const [goalDuration, setGoalDuration] = useState(30);
  const [isSettingGoal, setIsSettingGoal] = useState(false);

  // Insights state
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Community state
  const [communityData, setCommunityData] = useState<CommunityData | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Log action form state
  const [selectedAction, setSelectedAction] = useState<keyof typeof ACTION_DETAILS>('walk_instead_of_drive');
  const [actionValue, setActionValue] = useState<number>(5);
  const [isLogging, setIsLogging] = useState(false);
  const [actionError, setActionError] = useState('');
  
  // Interactive notifications
  const [notification, setNotification] = useState<{ type: string; title: string; desc: string } | null>(null);

  // Fetch Action Logs (supports page & optional category)
  const fetchLogs = useCallback(async (pageNum: number, categoryFilter: string) => {
    setLogsLoading(true);
    try {
      const catParam = categoryFilter !== 'all' ? `&category=${categoryFilter}` : '';
      const res = await fetch(`/api/logs?page=${pageNum}&limit=5${catParam}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setLogsPagination(data.pagination);
        setTotalSavings(data.totalSavings);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Fetch Active Goals
  const fetchGoal = useCallback(async () => {
    setGoalLoading(true);
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoal(data.goal);
        setGoalProgress(data.progress);
      }
    } catch (e) {
      console.error('Error fetching goal:', e);
    } finally {
      setGoalLoading(false);
    }
  }, []);

  // Fetch Insights Engine Data
  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (e) {
      console.error('Error fetching insights:', e);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Fetch Community Data
  const fetchCommunityData = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const res = await fetch('/api/community');
      if (res.ok) {
        const data = await res.json();
        setCommunityData(data);
      }
    } catch (e) {
      console.error('Error fetching community data:', e);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  // Initial Load & triggers when filter category changes
  useEffect(() => {
    if (user && user.hasBaseline) {
      Promise.resolve().then(() => {
        fetchLogs(page, filterCategory);
        fetchGoal();
        fetchInsights();
        if (activeTab === 'community') {
          fetchCommunityData();
        }
      });
    }
  }, [user, page, filterCategory, activeTab, fetchLogs, fetchGoal, fetchInsights, fetchCommunityData]);

  // Reset page when category filter changes
  const handleCategoryFilterChange = (cat: string) => {
    setFilterCategory(cat);
    setPage(1);
  };

  // Export action logs as a CSV file
  const handleExportCSV = async () => {
    try {
      const catParam = filterCategory !== 'all' ? `&category=${filterCategory}` : '';
      const res = await fetch(`/api/logs?page=1&limit=1000${catParam}`);
      if (!res.ok) return;
      const data = await res.json();
      const allLogs = data.logs as ActionLog[];

      const headers = ['Date', 'Action', 'Category', 'Quantity', 'CO2 Saved (kg)'];
      const rows = allLogs.map((log) => {
        const detail = ACTION_DETAILS[log.actionType as keyof typeof ACTION_DETAILS];
        return [
          new Date(log.loggedAt).toLocaleDateString(),
          detail?.label || log.actionType,
          log.category,
          `${log.value} ${detail?.unit || ''}`,
          log.co2Saved,
        ];
      });

      const csvString = [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `carbon_compass_history_${user?.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error exporting CSV:', e);
    }
  };

  // Memoized baseline calculations for charts
  const baselineInfo = useMemo(() => {
    if (!user || !user.baseline) return null;
    const b = user.baseline;
    
    // Emissions calculations based on multipliers
    const transportVal = b.transportDistance * (b.transportType === 'car' ? 0.20 : b.transportType === 'public' ? 0.05 : 0);
    const dietVal = b.dietType === 'high-meat' ? 600 : b.dietType === 'low-meat' ? 400 : b.dietType === 'vegetarian' ? 250 : 150;
    const energyVal = b.homeEnergyKwh * 0.45;
    const shoppingVal = b.shoppingLevel === 'high' ? 300 : b.shoppingLevel === 'medium' ? 175 : 75;

    return {
      transport: Math.round(transportVal),
      diet: dietVal,
      energy: Math.round(energyVal),
      shopping: shoppingVal,
      total: Math.round(b.calculatedBaseline),
    };
  }, [user]);

  // Handle Action Log Submission
  const handleLogAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    if (actionValue <= 0 || isNaN(actionValue)) {
      setActionError('Please enter a value greater than 0');
      return;
    }

    setIsLogging(true);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: selectedAction,
          value: actionValue,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Show badge unlocked toast if any
        if (data.unlockedBadges && data.unlockedBadges.length > 0) {
          const badgeType = data.unlockedBadges[0] as keyof typeof BADGE_INFO;
          const info = BADGE_INFO[badgeType];
          if (info) {
            setNotification({
              type: 'badge',
              title: `Badge Unlocked: ${info.name}`,
              desc: info.desc,
            });
            setTimeout(() => setNotification(null), 5000);
          }
        } else {
          // General log toast
          setNotification({
            type: 'log',
            title: 'Action Logged!',
            desc: `Saved ${data.co2Saved} kg of CO2e emissions.`,
          });
          setTimeout(() => setNotification(null), 3000);
        }

        // Reset input, reload values
        setActionValue(5);
        await refreshUser();
        fetchLogs(page, filterCategory);
        fetchGoal();
        if (activeTab === 'community') {
          fetchCommunityData();
        }
      } else {
        setActionError(data.error || 'Failed to log action');
      }
    } catch {
      setActionError('Network error logging action.');
    } finally {
      setIsLogging(false);
    }
  };

  // Handle setting a new Goal
  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingGoal(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetReductionPercent: targetReduction,
          durationDays: goalDuration,
        }),
      });

      if (res.ok) {
        setNotification({
          type: 'goal',
          title: 'Goal Established!',
          desc: `Striving to reduce your carbon footprint by ${targetReduction}%!`,
        });
        setTimeout(() => setNotification(null), 3500);
        fetchGoal();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSettingGoal(false);
    }
  };

  // Keyboard navigation helpers
  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'prev' && page > 1) {
      setPage(page - 1);
    } else if (direction === 'next' && page < logsPagination.totalPages) {
      setPage(page + 1);
    }
  };

  if (authLoading || !user || !baselineInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" aria-hidden="true" />
        <p className="text-slate-400 text-lg font-medium animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  // Calculate current footprint = baseline - average monthly savings
  const currentEstFootprint = Math.max(0, baselineInfo.total - totalSavings);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/85 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-400" aria-hidden="true" />
            <span className="text-lg font-black tracking-tight text-white">
              Carbon<span className="text-emerald-400">Compass</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak Counter */}
            <div
              className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/20 px-3 py-1.5 rounded-full text-amber-400 text-xs font-bold"
              aria-label={`Streaks: ${user.streakCount} days active`}
            >
              <Flame className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
              <span>{user.streakCount} DAY STREAK</span>
            </div>

            {/* User Profile Summary */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{user.name}</span>
              <span className="text-xxs text-slate-400 uppercase tracking-wider">Eco Advocate</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg focus:ring-1 focus:ring-red-400 transition cursor-pointer"
              aria-label="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* FLOATING NOTIFICATION BANNER */}
      {notification && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-slate-100 p-4 rounded-xl shadow-2xl flex items-start gap-3.5 max-w-sm animate-slide-up"
        >
          {notification.type === 'badge' ? (
            <Award className="w-10 h-10 text-emerald-400 shrink-0 animate-bounce" />
          ) : (
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          )}
          <div>
            <span className="block font-bold text-slate-100">{notification.title}</span>
            <span className="block text-xs text-slate-400 mt-1">{notification.desc}</span>
          </div>
        </div>
      )}

      {/* TAB SELECTOR (My Compass vs Community Feed) */}
      <div className="max-w-7xl w-full mx-auto px-6 mt-6">
        <div className="flex border-b border-slate-800" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'me'}
            aria-controls="panel-personal"
            id="tab-personal"
            onClick={() => setActiveTab('me')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 cursor-pointer transition ${
              activeTab === 'me'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Compass
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'community'}
            aria-controls="panel-community"
            id="tab-community"
            onClick={() => setActiveTab('community')}
            className={`py-3 px-6 text-sm font-semibold border-b-2 cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'community'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Community Hub</span>
          </button>
        </div>
      </div>

      {/* TAB PANELS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 md:space-y-8">
        
        {activeTab === 'me' ? (
          /* PERSONAL COMPASS VIEW */
          <div id="panel-personal" role="tabpanel" aria-labelledby="tab-personal" className="space-y-6 md:space-y-8 animate-fade-in">
            {/* OVERVIEW STATS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Stats Overview">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Baseline Footprint</span>
                  <span className="block text-4xl font-black text-white mt-2">{baselineInfo.total} <span className="text-lg font-medium text-slate-400">kg CO2e</span></span>
                </div>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Your estimated baseline emissions calculated during onboarding.
                </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-850 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Cumulative Savings
                  </span>
                  <span className="block text-4xl font-black text-emerald-400 mt-2">{totalSavings} <span className="text-lg font-medium text-emerald-500/60">kg CO2e</span></span>
                </div>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Total carbon emissions avoided by logging green actions. Keep going!
                </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Current Footprint (Est.)</span>
                  <span className="block text-4xl font-black text-white mt-2">{currentEstFootprint} <span className="text-lg font-medium text-slate-400">kg/mo</span></span>
                </div>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed font-semibold flex items-center gap-1 text-teal-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Reduced baseline by {baselineInfo.total > 0 ? Math.round((totalSavings / baselineInfo.total) * 100) : 0}%!</span>
                </p>
              </div>
            </section>

            {/* WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* COLUMN 1 */}
              <div className="lg:col-span-1 space-y-6 md:space-y-8">
                {/* ACTION LOGGER */}
                <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl" aria-labelledby="logger-title">
                  <div className="flex items-center gap-2 mb-4">
                    <Footprints className="w-5.5 h-5.5 text-emerald-400" />
                    <h2 id="logger-title" className="text-lg font-extrabold text-white">Log Green Action</h2>
                  </div>

                  {actionError && (
                    <p className="text-xs text-red-400 bg-red-950/40 p-2 border border-red-500/20 rounded-md mb-4" role="alert">{actionError}</p>
                  )}

                  <form onSubmit={handleLogAction} className="space-y-4">
                    <div>
                      <label htmlFor="action-select" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Action Performed
                      </label>
                      <select
                        id="action-select"
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value as keyof typeof ACTION_DETAILS)}
                        className="block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-850 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                      >
                        {Object.entries(ACTION_DETAILS).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="action-value" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Quantity ({ACTION_DETAILS[selectedAction].unit})
                      </label>
                      <input
                        id="action-value"
                        type="number"
                        min="1"
                        required
                        value={actionValue}
                        onChange={(e) => setActionValue(parseFloat(e.target.value) || 0)}
                        className="block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-850 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                      />
                      <span className="block text-xxs text-slate-500 mt-2 italic">
                        CO2e Avoided multiplier: {ACTION_DETAILS[selectedAction].baseSaving} kg per {ACTION_DETAILS[selectedAction].unit}.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLogging}
                      className="w-full flex justify-center items-center gap-1.5 py-2.5 border border-transparent rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-55 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 cursor-pointer shadow-lg shadow-emerald-500/10 font-bold"
                    >
                      {isLogging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{isLogging ? 'Logging...' : 'Log Action'}</span>
                    </button>
                  </form>
                </section>

                {/* GOALS */}
                <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl" aria-labelledby="goals-title">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5.5 h-5.5 text-emerald-400" />
                    <h2 id="goals-title" className="text-lg font-extrabold text-white">Reduction Goal</h2>
                  </div>

                  {goalLoading ? (
                    <div className="py-6 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    </div>
                  ) : goal && goalProgress ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-sm font-bold text-slate-200">Reduce Footprint by {goal.targetReductionPercent}%</span>
                          <span className="text-xxs text-slate-400 uppercase tracking-widest block mt-0.5">
                            Active till {new Date(goal.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 text-xxs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {goal.status}
                        </span>
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                          <span>Carbon Saved</span>
                          <span>{goalProgress.actualSavingsKg} / {goalProgress.targetSavingsKg} kg</span>
                        </div>
                        <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden" aria-label={`Goal completion: ${goalProgress.percent}%`}>
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${goalProgress.percent}%` }}
                          />
                        </div>
                        <span className="block text-xxs text-slate-400 mt-2 text-right">
                          {goalProgress.percent}% Completed
                        </span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSetGoal} className="space-y-4">
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">
                        Set a percentage-based emission reduction goal for the upcoming month.
                      </p>

                      <div>
                        <label htmlFor="goal-target" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Target Reduction (%)
                        </label>
                        <input
                          id="goal-target"
                          type="number"
                          min="1"
                          max="90"
                          value={targetReduction}
                          onChange={(e) => setTargetReduction(parseInt(e.target.value) || 0)}
                          className="block w-full px-3.5 py-2 bg-slate-950/80 border border-slate-850 rounded-lg text-slate-200 text-sm focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="goal-duration" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Goal Duration
                        </label>
                        <select
                          id="goal-duration"
                          value={goalDuration}
                          onChange={(e) => setGoalDuration(parseInt(e.target.value))}
                          className="block w-full px-3.5 py-2 bg-slate-950/80 border border-slate-850 rounded-lg text-slate-200 text-sm focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                        >
                          <option value={7}>7 Days (Weekly Challenge)</option>
                          <option value={30}>30 Days (Monthly Commitment)</option>
                          <option value={90}>90 Days (Quarterly Journey)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isSettingGoal}
                        className="w-full py-2 px-4 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-55 transition cursor-pointer font-bold shadow-md shadow-emerald-500/10"
                      >
                        {isSettingGoal ? 'Setting...' : 'Start Reduction Challenge'}
                      </button>
                    </form>
                  )}
                </section>
              </div>

              {/* COLUMN 2 */}
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                {/* CHARTS */}
                <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-6" aria-labelledby="analytics-title">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5.5 h-5.5 text-emerald-400" />
                    <h2 id="analytics-title" className="text-lg font-extrabold text-white">Footprint Analytics</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Breakdown */}
                    <div className="bg-slate-950/65 border border-slate-850 p-4 rounded-xl text-left">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Category Breakdown (Baseline)</span>
                      
                      <table className="sr-only">
                        <caption>Emission category breakdown table</caption>
                        <thead>
                          <tr>
                            <th scope="col">Category</th>
                            <th scope="col">Monthly Emissions (kg CO2e)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Transportation</td>
                            <td>{baselineInfo.transport} kg</td>
                          </tr>
                          <tr>
                            <td>Diet & Food</td>
                            <td>{baselineInfo.diet} kg</td>
                          </tr>
                          <tr>
                            <td>Home Energy</td>
                            <td>{baselineInfo.energy} kg</td>
                          </tr>
                          <tr>
                            <td>Shopping & Spending</td>
                            <td>{baselineInfo.shopping} kg</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="space-y-4" aria-hidden="true">
                        {[
                          { label: 'Transport', val: baselineInfo.transport, color: 'bg-indigo-500' },
                          { label: 'Diet & Food', val: baselineInfo.diet, color: 'bg-emerald-500' },
                          { label: 'Home Energy', val: baselineInfo.energy, color: 'bg-amber-500' },
                          { label: 'Shopping', val: baselineInfo.shopping, color: 'bg-rose-500' },
                        ].map((item) => {
                          const pct = baselineInfo.total > 0 ? (item.val / baselineInfo.total) * 100 : 0;
                          return (
                            <div key={item.label}>
                              <div className="flex justify-between text-xs font-semibold text-slate-450 mb-1">
                                <span>{item.label}</span>
                                <span>{item.val} kg ({Math.round(pct)}%)</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${item.color} rounded-full`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comparisons */}
                    <div className="bg-slate-950/65 border border-slate-850 p-4 rounded-xl text-left flex flex-col justify-between">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Baseline Comparison</span>
                        <p className="sr-only">
                          Comparison data: Your monthly baseline emissions are {baselineInfo.total} kg CO2e, compared to global average 400 kg, national average 1300 kg, and sustainable target 200 kg.
                        </p>

                        <div className="space-y-3.5" aria-hidden="true">
                          {[
                            { label: 'Your Baseline', val: baselineInfo.total, color: 'bg-emerald-400', max: 1300 },
                            { label: 'Global Average', val: 400, color: 'bg-slate-500', max: 1300 },
                            { label: 'National Avg (US)', val: 1300, color: 'bg-indigo-600', max: 1300 },
                            { label: 'Sustainable Target', val: 200, color: 'bg-emerald-600', max: 1300 },
                          ].map((item) => {
                            const pct = Math.min(100, (item.val / item.max) * 100);
                            return (
                              <div key={item.label}>
                                <div className="flex justify-between text-xs font-semibold text-slate-455 mb-1">
                                  <span>{item.label}</span>
                                  <span className="font-bold">{item.val} kg/mo</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${item.color} rounded-full`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* INSIGHTS & BADGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* INSIGHTS */}
                  <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl flex flex-col" aria-labelledby="insights-title">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5.5 h-5.5 text-emerald-400" />
                      <h2 id="insights-title" className="text-lg font-extrabold text-white">Personal Insights</h2>
                    </div>

                    {insightsLoading ? (
                      <div className="py-8 flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      </div>
                    ) : insights ? (
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div
                            className="text-xs text-slate-350 leading-relaxed border-l-2 border-emerald-500 pl-3 mb-4"
                            dangerouslySetInnerHTML={{
                              __html: insights.message.replace(
                                /\*\*(.*?)\*\*/g,
                                '<strong class="text-white">$1</strong>'
                              ),
                            }}
                          />

                          <div className="space-y-3">
                            {insights.tips.map((tip) => (
                              <div
                                key={tip.id}
                                className="bg-slate-950/70 border border-slate-850/80 p-3.5 rounded-xl text-left hover:border-slate-800 transition"
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-xs font-bold text-slate-200">{tip.title}</span>
                                  <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 text-xxs px-1.5 py-0.5 rounded font-bold shrink-0">
                                    -{tip.savings} kg/mo
                                  </span>
                                </div>
                                <p className="text-xxs text-slate-400 mt-1 leading-relaxed">{tip.description}</p>
                                
                                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-850/30">
                                  <span className={`text-xxs font-semibold ${
                                    tip.difficulty === 'Easy' ? 'text-emerald-400' : tip.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'
                                  }`}>
                                    Difficulty: {tip.difficulty}
                                  </span>
                                  
                                  <button
                                    onClick={async () => {
                                      const baseSaving = tip.savings / 4;
                                      const value = Math.max(1, Math.round(baseSaving / (ACTION_DETAILS[tip.actionType as keyof typeof ACTION_DETAILS]?.baseSaving || 1)));
                                      
                                      setSelectedAction(tip.actionType as keyof typeof ACTION_DETAILS);
                                      setActionValue(value);
                                      document.getElementById('logger-title')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="text-xxs font-bold text-emerald-400 hover:text-emerald-350 cursor-pointer"
                                  >
                                    Try Action &rarr;
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No recommendations available.</p>
                    )}
                  </section>

                  {/* BADGES */}
                  <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl" aria-labelledby="badges-title">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5.5 h-5.5 text-emerald-400" />
                      <h2 id="badges-title" className="text-lg font-extrabold text-white">Your Achievements</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {Object.entries(BADGE_INFO).map(([key, info]) => {
                        const isUnlocked = user.badges.includes(key);
                        return (
                          <div
                            key={key}
                            className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center transition ${
                              isUnlocked
                                ? `bg-gradient-to-b ${info.color} border-slate-800 text-white shadow-md`
                                : 'bg-slate-950/40 border-slate-905 text-slate-600'
                            }`}
                            aria-label={`${info.name} badge: ${isUnlocked ? 'Unlocked' : 'Locked'}. ${info.desc}`}
                          >
                            <Award className={`w-8 h-8 ${isUnlocked ? 'text-white' : 'text-slate-700'} mb-1.5`} />
                            <span className={`text-xs font-bold ${isUnlocked ? 'text-white' : 'text-slate-405'}`}>{info.name}</span>
                            <span className={`text-xxs mt-0.5 leading-tight ${isUnlocked ? 'text-white/80' : 'text-slate-500'}`}>{info.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* PERSONAL LOG HISTORY */}
                <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4" aria-labelledby="history-title">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-5.5 h-5.5 text-emerald-400" />
                      <h2 id="history-title" className="text-lg font-extrabold text-white">Action History</h2>
                    </div>

                    {/* Filter & Export Controls */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="relative flex items-center bg-slate-950/80 border border-slate-850 rounded-lg px-2 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                        <select
                          value={filterCategory}
                          onChange={(e) => handleCategoryFilterChange(e.target.value)}
                          className="bg-transparent text-slate-200 py-1.5 pr-6 pl-0 border-none focus:outline-none text-xs cursor-pointer focus:ring-0"
                          aria-label="Filter action logs by category"
                        >
                          <option value="all">All Categories</option>
                          <option value="transport">Transportation</option>
                          <option value="diet">Diet & Food</option>
                          <option value="energy">Home Energy</option>
                          <option value="shopping">Shopping</option>
                        </select>
                      </div>

                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-350 bg-slate-850 hover:bg-slate-800 hover:text-white border border-slate-750 focus:outline-none focus:ring-1 focus:ring-slate-600 transition cursor-pointer"
                        title="Download history as a CSV spreadsheet"
                        aria-label="Export history to CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {logsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    </div>
                  ) : logs.length > 0 ? (
                    <div className="space-y-2.5">
                      {logs.map((log) => {
                        const detail = ACTION_DETAILS[log.actionType as keyof typeof ACTION_DETAILS];
                        const IconComp = detail?.icon || HelpCircle;
                        return (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl hover:border-slate-800 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
                                <IconComp className="w-4.5 h-4.5 text-emerald-400" />
                              </div>
                              <div>
                                <span className="block text-xs font-bold text-slate-200">{detail?.label || log.actionType}</span>
                                <span className="block text-xxs text-slate-500 mt-0.5">
                                  {log.value} {detail?.unit} logged on {new Date(log.loggedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <span className="bg-emerald-950/40 border border-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md shrink-0">
                              -{log.co2Saved} kg CO2e
                            </span>
                          </div>
                        );
                      })}

                      {/* PAGINATION */}
                      {logsPagination.totalPages > 1 && (
                        <nav
                          className="flex justify-between items-center pt-4 border-t border-slate-850/50"
                          aria-label="Action history pagination"
                        >
                          <button
                            onClick={() => handlePageChange('prev')}
                            disabled={page === 1}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-xxs font-bold text-slate-400 hover:text-slate-200 bg-slate-950/80 border border-slate-850 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous</span>
                          </button>
                          <span className="text-xxs text-slate-450 font-bold" aria-current="page">
                            PAGE {page} OF {logsPagination.totalPages}
                          </span>
                          <button
                            onClick={() => handlePageChange('next')}
                            disabled={page === logsPagination.totalPages}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-xxs font-bold text-slate-400 hover:text-slate-200 bg-slate-950/80 border border-slate-850 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Next page"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </nav>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-950/20 border border-slate-900 border-dashed rounded-xl">
                      <p className="text-xs text-slate-500 italic">No green actions found matching the criteria. Start logging above!</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : (
          /* COMMUNITY HUB VIEW */
          <div id="panel-community" role="tabpanel" aria-labelledby="tab-community" className="space-y-6 md:space-y-8 animate-fade-in">
            {/* COLLECTIVE IMPACT BANNER */}
            <section className="relative overflow-hidden bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/40 border border-emerald-500/20 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="text-center md:text-left space-y-2.5 relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xxs font-bold uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Collective Planet Impact</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">Together, We Make a Real Difference</h2>
                <p className="text-slate-300 text-sm max-w-xl">
                  Every action logged on CarbonCompass contributes to a collective carbon avoidance pool. Join hands to shift global averages.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 text-center shrink-0 min-w-[240px] shadow-inner relative z-10">
                <span className="block text-slate-450 text-xxs font-bold uppercase tracking-widest">TOTAL COMMUNITY SAVINGS</span>
                <span className="block text-4xl font-black text-emerald-400 mt-1.5 animate-pulse">
                  {communityLoading ? (
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  ) : (
                    `${communityData?.collectiveSavings || 0} kg`
                  )}
                </span>
                <span className="block text-slate-400 text-xxs mt-1 font-semibold">of CO2e emissions avoided</span>
              </div>
            </section>

            {communityLoading && !communityData ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              </div>
            ) : (
              /* LEADERBOARDS & SOCIAL FEED GRID */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                
                {/* 1. LEADERBOARDS (Savings + Streaks side-by-side) */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                  <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl" aria-labelledby="savings-leader-title">
                    <div className="flex items-center gap-2.5 mb-5 border-b border-slate-850/50 pb-4">
                      <Award className="w-5.5 h-5.5 text-emerald-400" />
                      <h3 id="savings-leader-title" className="text-lg font-extrabold text-white">Savings Champions</h3>
                    </div>

                    <div className="space-y-3">
                      {communityData?.leaderboard.savings && communityData.leaderboard.savings.length > 0 ? (
                        communityData.leaderboard.savings.map((u, i) => (
                          <div
                            key={u.id}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                              u.id === user.id
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-slate-950/40 border-slate-905 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <span className={`w-6 text-center font-black text-sm ${
                                i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-500' : 'text-slate-500'
                              }`}>
                                #{i + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-200">
                                {u.name} {u.id === user.id && <span className="text-xxs text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded font-medium border border-emerald-500/10 ml-1.5">YOU</span>}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-500/5">
                              {u.totalSaved} kg saved
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No savings history recorded yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl" aria-labelledby="streak-leader-title">
                    <div className="flex items-center gap-2.5 mb-5 border-b border-slate-850/50 pb-4">
                      <Flame className="w-5.5 h-5.5 text-amber-500" />
                      <h3 id="streak-leader-title" className="text-lg font-extrabold text-white">Streak Masters</h3>
                    </div>

                    <div className="space-y-3">
                      {communityData?.leaderboard.streaks && communityData.leaderboard.streaks.length > 0 ? (
                        communityData.leaderboard.streaks.map((u, i) => (
                          <div
                            key={u.id}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                              u.id === user.id
                                ? 'bg-amber-950/10 border-amber-500/20'
                                : 'bg-slate-950/40 border-slate-905 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <span className={`w-6 text-center font-black text-sm ${
                                i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-500' : 'text-slate-500'
                              }`}>
                                #{i + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-200">
                                {u.name} {u.id === user.id && <span className="text-xxs text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded font-medium border border-amber-500/10 ml-1.5">YOU</span>}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-amber-400 bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-500/5 flex items-center gap-1">
                              <Flame className="w-4 h-4 fill-amber-500" /> {u.streakCount} days
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No active user streaks.</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* 2. PUBLIC FEED OF ACTIVITIES */}
                <div className="lg:col-span-1">
                  <section className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl flex flex-col" aria-labelledby="public-feed-title">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-850/50 pb-4">
                      <Activity className="w-5.5 h-5.5 text-emerald-400 animate-pulse" />
                      <h3 id="public-feed-title" className="text-lg font-extrabold text-white">Live Activity</h3>
                    </div>

                    <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                      {communityData?.recentActivity && communityData.recentActivity.length > 0 ? (
                        communityData.recentActivity.map((activity) => {
                          const detail = ACTION_DETAILS[activity.actionType as keyof typeof ACTION_DETAILS];
                          return (
                            <div
                              key={activity.id}
                              className="bg-slate-950/65 border border-slate-905 p-3.5 rounded-xl text-left"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-200">
                                  {activity.userName} <span className="text-slate-550 font-normal">logged</span>
                                </span>
                                <span className="text-emerald-400 text-xxs font-black shrink-0">
                                  -{activity.co2Saved} kg
                                </span>
                              </div>
                              <p className="text-xxs text-slate-400 mt-1">
                                {detail?.label || activity.actionType}
                              </p>
                              <span className="block text-[10px] text-slate-550 mt-2 text-right">
                                {new Date(activity.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-6">Waiting for recent activities...</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 px-6 text-center text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 CarbonCompass. Helping you navigate to a zero-carbon lifestyle.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-help" title="Conforms to WCAG 2.1 AA requirements">WCAG 2.1 AA Compliant</span>
            <span>&middot;</span>
            <span className="hover:text-slate-400 cursor-help" title="Secure HTTP-only cookies & password hashes">Secure Encryption</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
