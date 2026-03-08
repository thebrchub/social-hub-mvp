import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Matches from './pages/Matches';
import Live from './pages/Live';
import Chats from './pages/Chats';       
import Settings from './pages/Settings'; 
import NotFound from './pages/NotFound';
import GlobalLoader from './components/GlobalLoader';
import { useAuthStore } from './store/useAuthStore';
import Profile from './pages/Profile';
import { WebSocketProvider } from './providers/WebSocketProvider';
import Friends from './pages/Friends';
import VidMatches from './pages/VidMatches';
import Labs from './pages/Labs';
import Donations from './pages/Donations';


// Helper Component to Protect Routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, needsOnboarding } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  
  return <>{children}</>;
};

function App() {
  const { isAuthenticated, needsOnboarding } = useAuthStore();
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Simulate "System Boot" (Remove this timeout when you have real backend checks)
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsAppLoading(false);
    }, 2000); // Shows loader for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  // SHOW LOADER IF APP IS INITIALIZING
  if (isAppLoading) {
    return <GlobalLoader />;
  }

  return (
    <BrowserRouter>
    <WebSocketProvider>
      <Routes>
        
        {/* --- FIX: ROOT ROUTE REDIRECT --- */}
        {/* Instantly redirects localhost:5173/ to the dashboard, triggering auth checks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* --- PUBLIC ROUTES --- */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
        />

        {/* --- ONBOARDING --- */}
        <Route 
          path="/onboarding" 
          element={isAuthenticated && needsOnboarding ? <Onboarding /> : <Navigate to="/dashboard" replace />} 
        />

        {/* --- PROTECTED APP ROUTES --- */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* FIX: Added ProtectedRoute wrapper to Profile */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* FIX: Added ProtectedRoute wrapper to Friends */}
        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/matches" 
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/vid-matches" 
          element={
            <ProtectedRoute>
              <VidMatches />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/chats" 
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/live" 
          element={
            <ProtectedRoute>
              <Live />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/labs" 
          element={
            <ProtectedRoute>
              <Labs />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/donations" 
          element={
            <ProtectedRoute>
              <Donations />
            </ProtectedRoute>
          } 
        />

         

        {/* Default Redirect to NotFound if page not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;