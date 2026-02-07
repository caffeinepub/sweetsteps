import { Outlet } from '@tanstack/react-router';
import { OnboardingResultProvider } from '../contexts/OnboardingResultContext';
import { InternetIdentityAuthorizeCallbackHandler } from './auth/InternetIdentityAuthorizeCallbackHandler';
import { PostAuthDisplayNameGate } from './auth/PostAuthDisplayNameGate';
import { AuthInitializationGate } from './auth/AuthInitializationGate';

export default function RootLayout() {
  return (
    <OnboardingResultProvider>
      <AuthInitializationGate>
        <InternetIdentityAuthorizeCallbackHandler />
        <PostAuthDisplayNameGate />
        <Outlet />
      </AuthInitializationGate>
    </OnboardingResultProvider>
  );
}
