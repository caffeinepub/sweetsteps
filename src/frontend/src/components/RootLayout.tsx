import { Outlet } from '@tanstack/react-router';
import { OnboardingResultProvider } from '../contexts/OnboardingResultContext';

export default function RootLayout() {
  return (
    <OnboardingResultProvider>
      <Outlet />
    </OnboardingResultProvider>
  );
}
