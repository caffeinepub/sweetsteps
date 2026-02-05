import { Outlet } from '@tanstack/react-router';
import { OnboardingResultProvider } from '../contexts/OnboardingResultContext';
import { InternetIdentityAuthorizeCallbackHandler } from './auth/InternetIdentityAuthorizeCallbackHandler';

export default function RootLayout() {
  return (
    <OnboardingResultProvider>
      <InternetIdentityAuthorizeCallbackHandler />
      <Outlet />
    </OnboardingResultProvider>
  );
}
