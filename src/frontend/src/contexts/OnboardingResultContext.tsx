import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

const OnboardingResultContext = createContext<OnboardingResultContextType | undefined>(undefined);

export function OnboardingResultProvider({ children }: { children: ReactNode }) {
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null);

  return (
    <OnboardingResultContext.Provider value={{ onboardingResult, setOnboardingResult }}>
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
