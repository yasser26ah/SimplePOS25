import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Layout } from './components/Layout';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Accounting } from './components/Accounting';


const AppContent: React.FC = () => {
  const { currentView } = useStore();

  return (
    <Layout>
      {currentView === 'POS' && <POS />}
      {currentView === 'ACCOUNTING' && <Accounting />}
      {currentView === 'INVENTORY' && <Inventory />}
      
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};