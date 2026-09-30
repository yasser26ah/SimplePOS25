import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Product, CartItem, Sale, Customer, PaymentMethod } from '../types';
import { INITIAL_PRODUCTS } from '../constants';
import {
  productsApi,
  categoriesApi,
  customersApi,
  salesApi,
  toUiProduct,
  toUiSale,
  findCustomerByNit,
  type PaymentMethod as ApiPaymentMethod,
} from '../src/api';
import {
  enqueueSale,
  getPendingCount,
  getRejectedCount,
  discardRejected,
  retryRejected,
  clearRejected,
  initOfflineSync,
  syncPendingSales,
  REJECTED_EVENT,
  type QueuedSale,
} from '../src/sync';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  dataMode: 'api' | 'local';
  online: boolean;
  pendingCount: number;
  rejectedCount: number;
  syncing: boolean;
  syncNow: () => Promise<void>;
  retrySale: (id: string) => void;
  discardSale: (id: string) => void;
  discardAllConflicts: () => void;
  reload: () => Promise<void>;
  currentView: 'POS' | 'INVENTORY' | 'ACCOUNTING'| 'BANKS' | 'CONFIG' | 'CONFLICTS';
  setCurrentView: (view: 'POS' | 'INVENTORY' | 'ACCOUNTING'| 'BANKS' | 'CONFIG' | 'CONFLICTS') => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (customer: Customer, paymentMethod: PaymentMethod) => Promise<Sale>;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

/** Convierte una venta encolada en el formato que usa la UI (modal, PDF). */
function queuedToUiSale(q: QueuedSale, total: number, items: CartItem[]): Sale {
  return {
    id: q.id,
    date: q.createdAt,
    items,
    total,
    customer: q.customer,
    paymentMethod: q.paymentMethod,
  };
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentView, setCurrentView] = useState<'POS' | 'INVENTORY' | 'ACCOUNTING' | 'BANKS' | 'CONFIG' | 'CONFLICTS'>('POS');
  const [dataMode, setDataMode] = useState<'api' | 'local'>('local');
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());
  const [rejectedCount, setRejectedCount] = useState(() => getRejectedCount());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  // Carrito: persistencia local (sobrevive recargas y cortes de luz).
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        /* carrito corrupto: se ignora */
      }
    }
  }, []);

  /** Envía una venta encolada al backend (misma ruta que una venta online). */
  const sendQueuedSale = useCallback(async (q: QueuedSale) => {
    const existing = await findCustomerByNit(q.customer.nit);
    if (!existing) {
      await customersApi.create(q.customer);
    }
    await salesApi.create({
      customer: q.customer,
      items: q.items,
      paymentMethod: q.paymentMethod,
    });
  }, []);

  // Sincronización automática: online/offline + background sync del service worker.
  // Las ventas que el servidor rechaza de forma permanente (ej. stock insuficiente)
  // pasan a la cola de "conflictos"; se reintenta al volver a la pestaña.
  useEffect(() => {
    const cleanup = initOfflineSync(
      sendQueuedSale,
      (sale) => {
        toast.success(`Venta offline ${sale.id} sincronizada`);
      },
      (status) => {
        setOnline(status.online);
        setPendingCount(status.pending);
      }
    );

    const syncAll = () =>
      syncPendingSales(sendQueuedSale).finally(() => setPendingCount(getPendingCount()));

    const syncOnVisible = () => {
      if (document.visibilityState === 'visible') syncAll();
    };

    let prevRejected = getRejectedCount();
    const onRejected = () => {
      const count = getRejectedCount();
      const delta = count - prevRejected;
      setRejectedCount(count);
      if (delta > 0) {
        toast.error(
          `${delta} venta(s) rechazada(s) por el servidor. Revísalas en Conflictos.`,
          { duration: 6000 }
        );
      }
      prevRejected = count;
    };

    document.addEventListener('visibilitychange', syncOnVisible);
    window.addEventListener(REJECTED_EVENT, onRejected);
    onRejected();
    return () => {
      document.removeEventListener('visibilitychange', syncOnVisible);
      window.removeEventListener(REJECTED_EVENT, onRejected);
      cleanup();
    };
  }, [sendQueuedSale]);

  // Carga datos desde la API. Si falla (sin backend / sin sesión), cae a localStorage.
  const reload = useCallback(async () => {
    if (!navigator.onLine) {
      setDataMode('local');
      return;
    }
    try {
      const [apiProducts, categories] = await Promise.all([
        productsApi.list(),
        categoriesApi.list(),
      ]);
      const catName = new Map(categories.map((c) => [c.id, c.name]));
      const uiProducts = apiProducts
        .filter((p) => p.isActive)
        .map(toUiProduct)
        .map((p) => ({
          ...p,
          category: catName.get(
            (apiProducts.find((ap) => ap.id === p.id) as { categoryId?: string } | undefined)?.categoryId ?? ''
          ) ?? p.category,
        }));
      const apiSales = await salesApi.list();
      setProducts(uiProducts.length > 0 ? uiProducts : products);
      setSales(apiSales.map(toUiSale));
      setDataMode('api');
    } catch {
      setDataMode('local');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Sincroniza manualmente (botón en el Layout) y refresca datos del servidor. */
  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const synced = await syncPendingSales(sendQueuedSale);
      if (getPendingCount() === 0 && navigator.onLine) {
        await reload();
      }
      if (synced > 0) toast.success(`${synced} venta(s) sincronizada(s)`);
      else if (getPendingCount() === 0) toast.success('Todo sincronizado');
    } finally {
      setSyncing(false);
      setPendingCount(getPendingCount());
      setRejectedCount(getRejectedCount());
    }
  }, [syncing, reload, sendQueuedSale]);

  /** Reintenta una venta rechazada: vuelve a la cola pendiente y sincroniza de inmediato. */
  const retrySale = useCallback((id: string) => {
    const sale = retryRejected(id);
    if (!sale) return;
    setRejectedCount(getRejectedCount());
    setPendingCount(getPendingCount());
    toast.success(`Venta ${id} devuelta a la cola. Sincronizando…`);
    void syncPendingSales(sendQueuedSale).finally(() => {
      setPendingCount(getPendingCount());
      setRejectedCount(getRejectedCount());
    });
  }, [sendQueuedSale]);

  /** Descarta definitivamente una venta rechazada. */
  const discardSale = useCallback((id: string) => {
    const removed = discardRejected(id);
    if (!removed) return;
    setRejectedCount(getRejectedCount());
    toast.success(`Venta ${id} descartada`);
  }, []);

  /** Descarta todos los conflictos listados. */
  const discardAllConflicts = useCallback(() => {
    clearRejected();
    setRejectedCount(0);
    toast.success('Conflictos descartados');
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const completeSale = async (customer: Customer, paymentMethod: PaymentMethod): Promise<Sale> => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (dataMode === 'api') {
      // Venta online: transaccional en el servidor.
      try {
        const existing = await findCustomerByNit(customer.nit);
        if (!existing) {
          await customersApi.create({
            name: customer.name,
            email: customer.email,
            nit: customer.nit,
          });
        }
        const apiSale = await salesApi.create({
          customer,
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          paymentMethod: paymentMethod as ApiPaymentMethod,
        });
        const uiSale = toUiSale(apiSale);
        setSales((prev) => [uiSale, ...prev]);
        setCart([]);
        const apiProducts = await productsApi.list();
        setProducts(apiProducts.filter((p) => p.isActive).map(toUiProduct));
        return uiSale;
      } catch (error) {
        // Red caída u otro fallo de conectividad → encolar para sync posterior.
        if (isConnectivityError(error)) {
          return enqueueOfflineSale(customer, paymentMethod, total);
        }
        const message = error instanceof Error ? error.message : 'Error al registrar la venta';
        toast.error(message);
        throw error;
      }
    }

    // Modo con sesión creada pero sin datos de servidor aún: encolar también.
    if (localStorage.getItem('accessToken')) {
      return enqueueOfflineSale(customer, paymentMethod, total);
    }

    // Modo demo puro (sin sesión ni servidor): comportamiento original.
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(c => c.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));

    const newSale: Sale = {
      id: `L-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total,
      customer,
      paymentMethod,
    };

    setSales(prev => [newSale, ...prev]);
    setCart([]);
    return newSale;
  };

  /** Guarda la venta en la cola offline y devuelve un Sale para el modal/PDF. */
  function enqueueOfflineSale(customer: Customer, paymentMethod: PaymentMethod, total: number): Sale {
    const items = [...cart];
    const queuedItems = items.map((item) => ({ productId: item.id, quantity: item.quantity }));
    const localId = enqueueSale({
      customer,
      items: queuedItems,
      paymentMethod,
      // Precio por producto para poder mostrar totales en la UI de conflictos.
      salePrice: Object.fromEntries(items.map((i) => [i.id, i.price])),
    });
    setCart([]);
    setPendingCount(getPendingCount());
    const uiSale = queuedToUiSale(
      {
        id: localId,
        createdAt: new Date().toISOString(),
        customer,
        items: queuedItems,
        paymentMethod,
      },
      total,
      items
    );
    setSales((prev) => [uiSale, ...prev]);
    // Optimista: descuenta stock local; el servidor será la verdad al sincronizar.
    setProducts(prev => prev.map(p => {
      const cartItem = items.find(c => c.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));
    toast.success('Venta guardada sin conexión. Se enviará al reconectar.');
    return uiSale;
  }

  function isConnectivityError(error: unknown): boolean {
    if (error instanceof TypeError) return true; // fetch falló (red/DNS/CORS offline)
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  }

  const addProduct = (product: Product) => {
    if (dataMode === 'api') {
      toast.error('Usa el formulario de Inventario con SKU para crear productos en el servidor.');
      return;
    }
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (product: Product) => {
    if (dataMode === 'api') {
      productsApi
        .update(product.id, { name: product.name, price: product.price })
        .then(() => toast.success('Producto actualizado'))
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar'));
      return;
    }
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const deleteProduct = (id: string) => {
    if (dataMode === 'api') {
      productsApi
        .remove(id)
        .then(() => toast.success('Producto eliminado'))
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'));
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <StoreContext.Provider value={{
      products, cart, sales, dataMode, online, pendingCount, rejectedCount, syncing, syncNow, reload, currentView, setCurrentView,
      retrySale, discardSale, discardAllConflicts,
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      completeSale, addProduct, updateProduct, deleteProduct
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
