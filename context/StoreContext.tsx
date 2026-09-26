import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  dataMode: 'api' | 'local';
  reload: () => Promise<void>;
  currentView: 'POS' | 'INVENTORY' | 'ACCOUNTING'| 'BANKS' | 'CONFIG';
  setCurrentView: (view: 'POS' | 'INVENTORY' | 'ACCOUNTING'| 'BANKS' | 'CONFIG') => void;
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

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentView, setCurrentView] = useState<'POS' | 'INVENTORY' | 'ACCOUNTING' | 'BANKS' | 'CONFIG'>('POS');
  const [dataMode, setDataMode] = useState<'api' | 'local'>('local');

  // Carga datos desde la API. Si falla (sin backend / sin sesión), cae a localStorage.
  const reload = useCallback(async () => {
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

  // Carrito: persistencia local (no requiere backend).
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
      // Flujo con backend: la venta es transaccional en el servidor.
      try {
        // Reutiliza el cliente si ya existe por NIT; si no, lo crea.
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
        // Refresca stock desde el servidor.
        const apiProducts = await productsApi.list();
        setProducts(apiProducts.filter((p) => p.isActive).map(toUiProduct));
        return uiSale;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al registrar la venta';
        toast.error(message);
        throw error;
      }
    }

    // Modo local (sin backend): comportamiento original.
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

  const addProduct = (product: Product) => {
    if (dataMode === 'api') {
      // La creación real requiere SKU/categoría; se hace vía Inventario (modal con SKU).
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
      products, cart, sales, dataMode, reload, currentView, setCurrentView,
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