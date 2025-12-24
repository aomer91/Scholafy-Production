
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { ViewState } from './types';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { ChildDashboard } from './pages/ChildDashboard';
import { Player } from './components/Player';
import { Auth } from './components/Auth';
import { AuthScreen } from './App'; // We might want to move AuthScreen to its own file later

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'parent' | 'child' }) => {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen bg-[#0b1527] flex items-center justify-center text-white">Loading Auth...</div>;
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/select-profile" element={<ProtectedRoute><AuthScreen /></ProtectedRoute>} />

            <Route
                path="/parent"
                element={
                    <ProtectedRoute role="parent">
                        <ParentDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/child"
                element={
                    <ProtectedRoute role="child">
                        <ChildDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/player/:lessonId"
                element={
                    <ProtectedRoute>
                        <Player />
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
