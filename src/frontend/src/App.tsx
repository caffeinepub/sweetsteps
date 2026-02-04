import { createRouter, RouterProvider, createRoute, createRootRoute } from '@tanstack/react-router';
import RootLayout from './components/RootLayout';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import SweetSummit from './pages/SweetSummit';
import WeeklyMountain from './pages/WeeklyMountain';
import Daily from './pages/Daily';
import Fridge from './pages/Fridge';

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: Signup
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: Onboarding
});

const sweetSummitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sweet-summit',
  component: SweetSummit
});

const weeklyMountainRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weekly-mountain',
  component: WeeklyMountain
});

const dailyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily',
  component: Daily
});

const fridgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fridge',
  component: Fridge
});

const routeTree = rootRoute.addChildren([
  indexRoute, 
  signupRoute, 
  loginRoute, 
  onboardingRoute, 
  sweetSummitRoute,
  weeklyMountainRoute,
  dailyRoute,
  fridgeRoute
]);

const router = createRouter({ routeTree });

function App() {
  return <RouterProvider router={router} />;
}

export default App;
