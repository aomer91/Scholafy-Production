import React from 'react';
import ReactDOM from 'react-dom/client';
import AppContent from './App';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);
