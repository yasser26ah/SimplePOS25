import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingCart, Package, BarChart3, Store, Wallet, ShoppingBag, ShoppingBasket} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView } = useStore();

  //Items de navegación - slidebar
  const NavItem = ({ view, icon: Icon, label }: { view: typeof currentView, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-1000 ${
        currentView === view 
          ? 'bg-green-600 text-white' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-orange-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
//Estructura del Layout
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-50 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-5 flex items-center space-x-2 border-b border-gray-200">
          <div className="bg-green-600 p-2 rounded-lg">
            <ShoppingBag className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 hover:text-orange-600 transition-colors duration-1000">SmartPOS</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view="POS" icon={ShoppingCart} label="Punto de Venta" />
          <NavItem view="INVENTORY" icon={Package} label="Inventario" />
          <NavItem view="ACCOUNTING" icon={BarChart3} label="Contabilidad" />
          <NavItem view="BANKS" icon={Wallet} label="Caja" />
        </nav>

        <div className="p-1 border-t border-gray-200">
          <div className="text-xs text-gray-400 text-center">
            v1.0.1 © {new Date().getFullYear()}
            {/* &copy; 2024 - anterior forma de describir el año */}
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