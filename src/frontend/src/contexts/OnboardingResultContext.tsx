import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ONBOARDING_STORAGE_KEY, safeParseJSON, safeStringifyJSON } from '../lib/onboardingPlaceholder';

interface OnboardingAnswers {
  vagueGoal: string;
  currentProgress: string;
  timeLimit: string;
}

interface WeeklyMountain {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface AIResponse {
  bigGoal: string;
  weeklyMountain: WeeklyMountain;
  dailyStep: string;
}

interface OnboardingResult {
  answers: OnboardingAnswers;
  aiResponse: AIResponse;
}

interface OnboardingResultContextType {
  onboardingResult: OnboardingResult | null;
  setOnboardingResult: (result: OnboardingResult) => void;
  clearOnboardingResult: () => void;
}

const OnboardingResultContext = createContext<OnboardingResultContextType | undefined>(undefined);

export function OnboardingResultProvider({ children }: { children: ReactNode }) {
  const [onboardingResult, setOnboardingResultState] = useState<OnboardingResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    console.log('[OnboardingResultContext] Hydrating from localStorage...');
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    console.log('[OnboardingResultContext] Raw stored value:', stored ? `${stored.substring(0, 100)}...` : 'null');
    
    const parsed = safeParseJSON<OnboardingResult>(stored);
    if (parsed) {
      console.log('[OnboardingResultContext] Successfully parsed onboarding result');
      setOnboardingResultState(parsed);
    } else {
      console.log('[OnboardingResultContext] No valid onboarding result found in localStorage');
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever onboardingResult changes
  const setOnboardingResult = (result: OnboardingResult) => {
    console.log('[OnboardingResultContext] Setting onboarding result:', result);
    setOnboardingResultState(result);
    const serialized = safeStringifyJSON(result);
    if (serialized) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, serialized);
      console.log('[OnboardingResultContext] Persisted to localStorage with key:', ONBOARDING_STORAGE_KEY);
      
      // Verify the write
      const verification = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (verification) {
        console.log('[OnboardingResultContext] Verification: Data successfully written to localStorage');
      } else {
        console.error('[OnboardingResultContext] Verification FAILED: Data not found in localStorage after write');
      }
    } else {
      console.error('[OnboardingResultContext] Failed to serialize onboarding result');
    }
  };

  // Clear persisted onboarding result
  const clearOnboardingResult = () => {
    console.log('[OnboardingResultContext] Clearing onboarding result');
    setOnboardingResultState(null);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  // Don't render children until hydration is complete to prevent flash
  if (!isHydrated) {
    return null;
  }

  return (
    <OnboardingResultContext.Provider value={{ onboardingResult, setOnboardingResult, clearOnboardingResult }}>
      {children}
    </OnboardingResultContext.Provider>
  );
}

export function useOnboardingResult() {
  const context = useContext(OnboardingResultContext);
  if (context === undefined) {
    throw new Error('useOnboardingResult must be used within OnboardingResultProvider');
  }
  return context;
}
