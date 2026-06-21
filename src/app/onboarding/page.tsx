'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Compass, Car, Flame, ShoppingBag, Utensils, CheckCircle, ArrowRight, ArrowLeft, Loader2, Award } from 'lucide-react';

type Step = 'welcome' | 'transport' | 'diet' | 'energy' | 'shopping' | 'results';

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // Onboarding responses
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [transportDistance, setTransportDistance] = useState<number>(300);
  const [transportType, setTransportType] = useState<'car' | 'public' | 'walk'>('car');
  const [dietType, setDietType] = useState<'vegan' | 'vegetarian' | 'low-meat' | 'high-meat'>('low-meat');
  const [homeEnergyKwh, setHomeEnergyKwh] = useState<number>(250);
  const [shoppingLevel, setShoppingLevel] = useState<'high' | 'medium' | 'low'>('medium');

  // Results state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [breakdown, setBreakdown] = useState<{ transport: number; diet: number; energy: number; shopping: number; total: number } | null>(null);
  const [badgeUnlocked, setBadgeUnlocked] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" aria-hidden="true" />
        <p className="text-slate-400 text-lg font-medium animate-pulse">Loading onboarding...</p>
      </div>
    );
  }

  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 'welcome') setCurrentStep('transport');
    else if (currentStep === 'transport') {
      if (transportDistance < 0 || isNaN(transportDistance)) {
        setErrorMsg('Please enter a valid monthly distance');
        return;
      }
      setCurrentStep('diet');
    }
    else if (currentStep === 'diet') setCurrentStep('energy');
    else if (currentStep === 'energy') {
      if (homeEnergyKwh < 0 || isNaN(homeEnergyKwh)) {
        setErrorMsg('Please enter a valid monthly energy usage');
        return;
      }
      setCurrentStep('shopping');
    }
    else if (currentStep === 'shopping') {
      submitBaseline();
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (currentStep === 'transport') setCurrentStep('welcome');
    else if (currentStep === 'diet') setCurrentStep('transport');
    else if (currentStep === 'energy') setCurrentStep('diet');
    else if (currentStep === 'shopping') setCurrentStep('energy');
  };

  const submitBaseline = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transportDistance,
          transportType,
          dietType,
          homeEnergyKwh,
          shoppingLevel,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBreakdown(data.breakdown);
        setBadgeUnlocked(data.badgeUnlocked);
        setCurrentStep('results');
        await refreshUser();
      } else {
        setErrorMsg(data.error || 'Failed to submit baseline calculations');
      }
    } catch {
      setErrorMsg('Network error, please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'transport': return 25;
      case 'diet': return 50;
      case 'energy': return 75;
      case 'shopping': return 100;
      case 'results': return 100;
    }
  };

  const stepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'transport': return 1;
      case 'diet': return 2;
      case 'energy': return 3;
      case 'shopping': return 4;
      default: return 5;
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 relative z-10 animate-slide-up">
        {/* Navigation Indicator */}
        {currentStep !== 'welcome' && currentStep !== 'results' && (
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-2">
              <span>QUESTIONNAIRE (STEP {stepNumber()} OF 4)</span>
              <span>{progressPercent()}% COMPLETE</span>
            </div>
            <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent()}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error message */}
        {errorMsg && (
          <div className="bg-red-950/60 border border-red-500/30 text-red-200 p-3 rounded-lg mb-6 text-sm" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Step: Welcome */}
        {currentStep === 'welcome' && (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Compass className="w-9 h-9 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome to CarbonCompass, {user.name}!
            </h1>
            <p className="text-slate-300 mt-4 text-base max-w-lg mx-auto leading-relaxed">
              Before we can start tracking and reducing your impact, we need to calculate your baseline carbon footprint.
              This short questionnaire asks about your transport, diet, home energy, and shopping habits.
            </p>
            <button
              onClick={handleNextStep}
              className="mt-8 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>Calculate Baseline</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Step: Transport */}
        {currentStep === 'transport' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-950/60 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">1. Transportation Habits</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              How do you commute and travel on average each month?
            </p>

            <div className="space-y-6">
              <div>
                <label htmlFor="distance-input" className="block text-sm font-semibold text-slate-300 mb-2">
                  Total Travel Distance (km / month)
                </label>
                <input
                  id="distance-input"
                  type="number"
                  min="0"
                  value={transportDistance}
                  onChange={(e) => setTransportDistance(parseInt(e.target.value) || 0)}
                  className="block w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <span className="block text-sm font-semibold text-slate-300 mb-3">Primary Transport Mode</span>
                <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Transport Mode Selection">
                  {(['car', 'public', 'walk'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={transportType === type}
                      onClick={() => setTransportType(type)}
                      className={`p-4 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition ${
                        transportType === type
                          ? 'bg-slate-800/80 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      <Car className="w-6 h-6" />
                      <span className="text-xs font-semibold capitalize">{type === 'walk' ? 'Walk / Cycle' : type === 'public' ? 'Public Transit' : 'Personal Car'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Diet */}
        {currentStep === 'diet' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-950/60 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <Utensils className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">2. Diet & Food Habits</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Greenhouse gas emissions vary widely depending on the foods you choose to consume. Select the diet category that fits you best:
            </p>

            <div className="space-y-3" role="radiogroup" aria-label="Diet Selection">
              {[
                { type: 'high-meat', title: 'High Meat Consumer', desc: 'Frequent red meat (beef, pork) or poultry consumer, almost daily.' },
                { type: 'low-meat', title: 'Low Meat / Flexitarian', desc: 'Eat poultry and fish, but eat red meat infrequently or in small portions.' },
                { type: 'vegetarian', title: 'Vegetarian', desc: 'No meat, poultry, or fish. Consumes dairy, eggs, and cheese.' },
                { type: 'vegan', title: 'Vegan', desc: 'Strict plant-based diet. Avoid all animal-derived foods.' }
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  role="radio"
                  aria-checked={dietType === item.type}
                  onClick={() => setDietType(item.type as 'vegan' | 'vegetarian' | 'low-meat' | 'high-meat')}
                  className={`w-full text-left p-4 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    dietType === item.type
                      ? 'bg-slate-800/80 border-emerald-500 text-slate-100'
                      : 'bg-slate-950/60 border-slate-850 text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <div className="pr-4">
                    <span className={`block font-semibold text-sm ${dietType === item.type ? 'text-emerald-400' : 'text-slate-200'}`}>{item.title}</span>
                    <span className="block text-xs text-slate-400 mt-1">{item.desc}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    dietType === item.type ? 'border-emerald-500' : 'border-slate-700'
                  }`}>
                    {dietType === item.type && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Energy */}
        {currentStep === 'energy' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-950/60 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">3. Home Energy Consumption</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Household energy grids consume significant fossil fuels. Let&apos;s estimate your energy footprint.
            </p>

            <div className="space-y-6">
              <div>
                <label htmlFor="energy-input" className="block text-sm font-semibold text-slate-300 mb-2">
                  Average Electricity Consumption (kWh / month)
                </label>
                <input
                  id="energy-input"
                  type="number"
                  min="0"
                  value={homeEnergyKwh}
                  onChange={(e) => setHomeEnergyKwh(parseInt(e.target.value) || 0)}
                  className="block w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: A typical household consumes about 250-400 kWh per month. Check a utility bill for your exact average.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Shopping */}
        {currentStep === 'shopping' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-950/60 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">4. Shopping & Consumption Habits</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Manufacturing new products (clothes, gadgets) creates carbon emissions. How would you rate your spending habits?
            </p>

            <div className="space-y-3" role="radiogroup" aria-label="Shopping Selection">
              {[
                { type: 'high', title: 'High consumption', desc: 'Frequently buy new clothing, electronics, gadgets, and household goods.' },
                { type: 'medium', title: 'Moderate / Balanced', desc: 'Occasional shopper. Sometimes choose secondhand, and repair items when possible.' },
                { type: 'low', title: 'Low consumer', desc: 'Minimalist shopper. Mostly buy secondhand, repair-first mentality, and reuse everything.' }
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  role="radio"
                  aria-checked={shoppingLevel === item.type}
                  onClick={() => setShoppingLevel(item.type as 'low' | 'medium' | 'high')}
                  className={`w-full text-left p-4 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    shoppingLevel === item.type
                      ? 'bg-slate-800/80 border-emerald-500 text-slate-100'
                      : 'bg-slate-950/60 border-slate-850 text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <div className="pr-4">
                    <span className={`block font-semibold text-sm ${shoppingLevel === item.type ? 'text-emerald-400' : 'text-slate-200'}`}>{item.title}</span>
                    <span className="block text-xs text-slate-400 mt-1">{item.desc}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    shoppingLevel === item.type ? 'border-emerald-500' : 'border-slate-700'
                  }`}>
                    {shoppingLevel === item.type && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Results */}
        {currentStep === 'results' && breakdown && (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight">Your baseline is ready!</h1>
            <p className="text-slate-400 text-sm mt-1">We&apos;ve calculated your estimated monthly carbon output.</p>

            {/* Large Carbon Number Callout */}
            <div className="my-8 bg-slate-950/80 border border-slate-800/60 p-6 rounded-2xl max-w-sm mx-auto shadow-inner">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-widest">BASELINE CARBON FOOTPRINT</span>
              <span className="block text-5xl font-black text-emerald-400 mt-2">{breakdown.total}</span>
              <span className="block text-slate-400 text-sm font-semibold mt-1">kg CO2e / month</span>
            </div>

            {/* Badge Unlocked Notification */}
            {badgeUnlocked && (
              <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-100 p-4 rounded-xl mb-6 max-w-md mx-auto text-left shadow-lg shadow-emerald-500/5">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center shrink-0 animate-bounce">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase text-emerald-400">Achievement Unlocked!</span>
                  <span className="block text-sm font-bold text-slate-100">Baseline Pioneer</span>
                  <span className="block text-xs text-slate-400 mt-0.5">Completed onboarding and established baseline carbon footprint.</span>
                </div>
              </div>
            )}

            {/* Category Breakdown list (accessible data-table fallback & bar charts) */}
            <div className="mb-8 max-w-md mx-auto text-left">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4 text-center">Emission Breakdown</h2>
              
              {/* Screen reader table fallback */}
              <table className="sr-only">
                <caption>Monthly emissions breakdown table</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Emissions (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Transportation</td>
                    <td>{breakdown.transport} kg</td>
                  </tr>
                  <tr>
                    <td>Diet & Food</td>
                    <td>{breakdown.diet} kg</td>
                  </tr>
                  <tr>
                    <td>Home Energy</td>
                    <td>{breakdown.energy} kg</td>
                  </tr>
                  <tr>
                    <td>Shopping & Spending</td>
                    <td>{breakdown.shopping} kg</td>
                  </tr>
                </tbody>
              </table>

              {/* Accessible CSS Chart bars */}
              <div className="space-y-4" aria-hidden="true">
                {[
                  { label: 'Transportation', val: breakdown.transport, color: 'bg-indigo-500' },
                  { label: 'Diet & Food', val: breakdown.diet, color: 'bg-emerald-500' },
                  { label: 'Home Energy', val: breakdown.energy, color: 'bg-amber-500' },
                  { label: 'Shopping', val: breakdown.shopping, color: 'bg-rose-500' },
                ].map((item) => {
                  const percent = breakdown.total > 0 ? (item.val / breakdown.total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                        <span>{item.label}</span>
                        <span>{item.val} kg CO2e ({Math.round(percent)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average Comparison Callout */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl text-left max-w-md mx-auto text-xs space-y-2 mb-8">
              <span className="block font-bold text-slate-300 mb-1">National & Global Comparison:</span>
              <div className="flex justify-between text-slate-400">
                <span>Your Baseline:</span>
                <span className="font-bold text-slate-200">{breakdown.total} kg/month</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Global Average:</span>
                <span>400 kg/month</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>National Average (US):</span>
                <span>1,300 kg/month</span>
              </div>
              <div className="pt-2 border-t border-slate-850 text-slate-400 text-center font-medium">
                {breakdown.total < 400 ? (
                  <span className="text-emerald-400">Wow, you are currently below the global average footprint! 🌟</span>
                ) : breakdown.total < 1300 ? (
                  <span className="text-teal-400">Nice! You are below the national average. Let&apos;s get to the global target! 📈</span>
                ) : (
                  <span className="text-amber-400">You are above average. We have plenty of room to reduce together! 💪</span>
                )}
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full max-w-md py-3.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Enter Dashboard & Track Habits
            </button>
          </div>
        )}

        {/* Wizard Footer Controls */}
        {currentStep !== 'welcome' && currentStep !== 'results' && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-sm font-semibold text-slate-400 hover:text-slate-250 hover:bg-slate-850/40 focus:outline-none focus:ring-1 focus:ring-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNextStep}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-55 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition cursor-pointer shadow-md shadow-emerald-500/10"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <span>{currentStep === 'shopping' ? 'Complete Onboarding' : 'Next Step'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
