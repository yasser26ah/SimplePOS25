import React from 'react';
import { Toaster } from 'react-hot-toast';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Accounting } from './components/Accounting';
import Banks from './components/Banks';
import { Settings } from './components/Settings';
import { Login } from './components/Login';

const AppContent: React.FC = () => {
  const { currentView } = useStore();

  return (
    <Layout>
      {currentView === 'POS' && <POS />}
      {currentView === 'ACCOUNTING' && <Accounting />}
      {currentView === 'INVENTORY' && <Inventory />}
      {currentView === 'BANKS' && <Banks />}
      {currentView === 'CONFIG' && <Settings />}
    </Layout>
  );
};

const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return <AppContent />;
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AuthGate />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: '12px', fontWeight: 600 },
          }}
        />
      </StoreProvider>
    </AuthProvider>
  );
};