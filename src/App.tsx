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
import GlobalLoader from './components/GlobalLoader'; // <--- Import the Boot Loader
import { useAuthStore } from './store/useAuthStore';

// Helper Component to Protect Routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, needsOnboarding } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  
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
      <Routes>
        
        {/* --- PUBLIC ROUTES --- */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} 
        />

        {/* --- ONBOARDING --- */}
        <Route 
          path="/onboarding" 
          element={isAuthenticated && needsOnboarding ? <Onboarding /> : <Navigate to="/dashboard" />} 
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

        <Route 
          path="/matches" 
          element={
            <ProtectedRoute>
              <Matches />
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
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />

        {/* Default Redirect to NotFound if page not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;