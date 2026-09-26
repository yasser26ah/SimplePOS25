import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Package, BarChart3, Wallet, ShoppingBag, Menu, X, Settings2, ChevronLeft, LogOut, UserCircle, Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';

//Componente NavBar - Sidebar sin desplegar(false) y desplegado(true)
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView, dataMode, online, pendingCount, syncing, syncNow } = useStore();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [installable, setInstallable] = useState(false);

  // Detecta disponibilidad de instalación PWA y actualizaciones del service worker.
  React.useEffect(() => {
    const onInstallable = () => setInstallable(true);
    window.addEventListener('simplepos:pwa-installable', onInstallable);
    return () => window.removeEventListener('simplepos:pwa-installable', onInstallable);
  }, []);

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

        <div className="p-3 border-t border-gray-100 space-y-2">
          {/* Estado de conexión y cola offline */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="flex-1">
              {!online
                ? 'Sin conexión — modo offline'
                : pendingCount > 0
                  ? `${pendingCount} venta(s) pendiente(s)`
                  : 'En línea'}
            </span>
            {pendingCount > 0 && (
              <button
                onClick={() => void syncNow()}
                disabled={syncing}
                className="p-1 rounded hover:bg-white/60 disabled:opacity-50"
                aria-label="Sincronizar ahora"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {installable && (
            <button
              onClick={async () => {
                const { promptInstall } = await import('../src/pwa');
                await promptInstall();
                setInstallable(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition text-sm font-medium"
            >
              <Download size={18} /> Instalar app
            </button>
          )}

          {user && (
            <div className="flex items-center gap-2 px-2 py-1">
              <UserCircle size={20} className="text-gray-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700 truncate">{user.username}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition text-sm font-medium"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
          <div className="text-[10px] text-gray-300 text-center">
            {dataMode === 'api' ? 'Conectado al servidor' : 'Modo local'} · v2.2.0 © {new Date().getFullYear()}
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