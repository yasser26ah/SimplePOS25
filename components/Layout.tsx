import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingCart, Package, BarChart3, Store } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView } = useStore();

  const NavItem = ({ view, icon: Icon, label }: { view: typeof currentView, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
        currentView === view 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center space-x-2 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Store className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">SmartPOS</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="POS" icon={ShoppingCart} label="Punto de Venta" />
          <NavItem view="INVENTORY" icon={Package} label="Inventario" />
          <NavItem view="ACCOUNTING" icon={BarChart3} label="Contabilidad" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            v1.0.0 &copy; 2024
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
    </div>
  );
};