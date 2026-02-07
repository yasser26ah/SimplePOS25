import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingCart, Package, BarChart3, Wallet, ShoppingBag, Menu, X, Bold, Settings, Settings2, ChevronLeft  } from 'lucide-react';

//Componente NavBar - Sidebar sin desplegar(false) y desplegado(true)
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  //Items de navegación - slidebar
  const NavItem = ({ view, icon: Icon, label }: { view: typeof currentView, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSidebarOpen(false);
      }}
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

//Estructura del NavBar - Sidebar, los distintos desplegables y el area principal
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-bold text-gray-800 hover:text-orange-600 transition-colors duration-1000">SimplePOS</h1>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white h-full border-r border-gray-200 flex flex-col shadow-xl transition-transform duration-300 transform
        lg:relative lg:translate-x-0 lg:w-64 lg:shadow-none lg:z-10
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800 hover:text-orange-600 transition-colors duration-1000">SimplePOS</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
         <NavItem view="POS" icon={ShoppingCart} label="Punto de Venta" />
          <NavItem view="INVENTORY" icon={Package} label="Inventario" />
          <NavItem view="ACCOUNTING" icon={BarChart3} label="Contabilidad" />
          <NavItem view="BANKS" icon={Wallet} label="Caja" />
          <NavItem view="CONFIG" icon={Settings2} label="Configuración" />
        </nav>

        <div className="p-2 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
              v2.0.1 © {new Date().getFullYear()}
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-gray-50">
        {children}
      </main>
    </div>
  );
};