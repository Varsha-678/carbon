'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Compass, Leaf, Lock, Mail, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.hasBaseline) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen text-slate-100 bg-slate-950">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" aria-hidden="true" />
        <p className="text-slate-400 text-lg font-medium animate-pulse">Loading CarbonCompass...</p>
      </div>
    );
  }

  // Frontend Zod-like simple client-side checks
  const validateForm = () => {
    const errors: { email?: string; password?: string; name?: string } = {};
    let isValid = true;

    if (!email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email address';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!isLoginTab) {
      if (!name.trim()) {
        errors.name = 'Name is required';
        isValid = false;
      } else if (name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isLoginTab) {
        const result = await login(email, password);
        if (!result.success) {
          setErrorMsg(result.error || 'Invalid credentials');
        }
      } else {
        const result = await register(name, email, password);
        if (!result.success) {
          setErrorMsg(result.error || 'Registration failed');
        }
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 relative z-10 animate-slide-up">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/30 rounded-full flex items-center justify-center mb-3 shadow-inner shadow-emerald-500/10">
            <Compass className="w-8 h-8 text-emerald-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
            Carbon<span className="text-emerald-400">Compass</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xs">
            Understand, track, and reduce your carbon footprint with small daily habits.
          </p>
        </div>

        {/* Auth Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-950/80 p-1 rounded-lg mb-6 border border-slate-800" role="tablist">
          <button
            role="tab"
            aria-selected={isLoginTab}
            aria-controls="auth-form"
            id="tab-login"
            onClick={() => {
              setIsLoginTab(true);
              setErrorMsg('');
              setFormErrors({});
            }}
            className={`py-2 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
              isLoginTab
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={!isLoginTab}
            aria-controls="auth-form"
            id="tab-register"
            onClick={() => {
              setIsLoginTab(false);
              setErrorMsg('');
              setFormErrors({});
            }}
            className={`py-2 text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer ${
              !isLoginTab
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            className="flex items-start gap-2.5 bg-red-950/60 border border-red-500/30 text-red-200 p-3.5 rounded-lg mb-6 text-sm animate-fade-in"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form id="auth-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
          {!isLoginTab && (
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <UserIcon className="h-5 h-5 text-slate-500" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                    formErrors.name ? 'border-red-500/80' : 'border-slate-800'
                  } focus:border-emerald-500 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none transition duration-150`}
                  placeholder="Jane Doe"
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? "name-error" : undefined}
                />
              </div>
              {formErrors.name && (
                <p className="mt-1.5 text-xs text-red-400" id="name-error">{formErrors.name}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                <Mail className="h-5 h-5 text-slate-500" />
              </div>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                  formErrors.email ? 'border-red-500/80' : 'border-slate-800'
                } focus:border-emerald-500 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none transition duration-150`}
                placeholder="you@example.com"
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? "email-error" : undefined}
              />
            </div>
            {formErrors.email && (
              <p className="mt-1.5 text-xs text-red-400" id="email-error">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                <Lock className="h-5 h-5 text-slate-500" />
              </div>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                  formErrors.password ? 'border-red-500/80' : 'border-slate-800'
                } focus:border-emerald-500 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none transition duration-150`}
                placeholder="••••••••"
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? "password-error" : undefined}
              />
            </div>
            {formErrors.password && (
              <p className="mt-1.5 text-xs text-red-400" id="password-error">{formErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-55 disabled:cursor-not-allowed transition duration-150 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Leaf className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <span>{isSubmitting ? 'Authenticating...' : isLoginTab ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        {/* Feature list preview for onboarding validation */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-emerald-500" /> Calculate baseline</span>
          <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-emerald-500" /> Log daily green habits</span>
          <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-emerald-500" /> Unlock goals</span>
        </div>
      </div>
    </main>
  );
}
