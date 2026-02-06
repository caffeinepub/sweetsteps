import { Outlet } from '@tanstack/react-router';
import { OnboardingResultProvider } from '../contexts/OnboardingResultContext';
import { InternetIdentityAuthorizeCallbackHandler } from './auth/InternetIdentityAuthorizeCallbackHandler';
import { PostAuthDisplayNameGate } from './auth/PostAuthDisplayNameGate';

export default function RootLayout() {
  return (
    <OnboardingResultProvider>
      <InternetIdentityAuthorizeCallbackHandler />
      <PostAuthDisplayNameGate />
      <Outlet />
    </OnboardingResultProvider>
  );
}
