// Capa de acceso a datos de SimplePOS sobre la API REST.

import { apiDelete, apiGet, apiPost, apiPut } from './client';

export { tokens, API_URL, ApiError } from './client';
export type { ApiEnvelope } from './client';
import type { Customer, Product, Sale } from '../../types';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

// ---------- Tipos del dominio (tal como los devuelve la API) ----------

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface ApiProduct {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  price: number;
  costPrice?: number | null;
  categoryId: string;
  category: { id: string; name: string };
  imageUrl?: string | null;
  isActive: boolean;
  inventory: { quantity: number; minStock: number }[];
}

export interface ApiCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface ApiCustomer {
  id: string;
  name: string;
  email: string;
  nit: string;
  phone?: string | null;
  isActive: boolean;
}

export interface ApiSale {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  customer: ApiCustomer;
  items: { id: string; productId: string; quantity: number; unitPrice: number; subtotal: number; product: { id: string; name: string } }[];
  payments: { id: string; method: string; amount: number }[];
}

export interface BusinessSettings {
  storeName: string;
  nit: string;
  address: string;
  phone: string;
  taxRate: number; // porcentaje, ej. 19
  lowStockThreshold: number;
}

// ---------- Auth ----------

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<AuthSession>('/api/auth/login', { email, password }),
  me: () => apiGet<ApiUser>('/api/auth/me'),
  logout: () => apiPost<null>('/api/auth/logout').catch(() => null),
};

// ---------- Categories ----------

export const categoriesApi = {
  list: () => apiGet<ApiCategory[]>('/api/categories'),
  create: (data: { name: string; description?: string }) => apiPost<ApiCategory>('/api/categories', data),
};

// ---------- Products ----------

/** Convierte un producto de la API al formato que usa la UI. */
export function toUiProduct(p: ApiProduct): Product {
  const stock = p.inventory?.reduce((acc, inv) => acc + inv.quantity, 0) ?? 0;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock,
    category: p.category?.name ?? 'General',
    image: p.imageUrl || `https://picsum.photos/200/200?random=${encodeURIComponent(p.sku)}`,
  };
}

export const productsApi = {
  list: () => apiGet<ApiProduct[]>('/api/products'),
  create: (data: {
    name: string;
    sku: string;
    price: number;
    categoryId: string;
    description?: string;
    imageUrl?: string;
    stock?: number;
  }) => apiPost<ApiProduct>('/api/products', data),
  update: (id: string, data: Partial<{ name: string; price: number; categoryId: string; description: string; imageUrl: string; isActive: boolean }>) =>
    apiPut<ApiProduct>(`/api/products/${id}`, data),
  remove: (id: string) => apiDelete<null>(`/api/products/${id}`),
};

// ---------- Customers ----------

export const customersApi = {
  list: () => apiGet<ApiCustomer[]>('/api/customers'),
  create: (data: { name: string; email: string; nit: string; phone?: string }) =>
    apiPost<ApiCustomer>('/api/customers', data),
  update: (id: string, data: Partial<{ name: string; email: string; nit: string; phone: string; isActive: boolean }>) =>
    apiPut<ApiCustomer>(`/api/customers/${id}`, data),
};

/** Busca un cliente por NIT o devuelve null si no existe. */
export async function findCustomerByNit(nit: string): Promise<ApiCustomer | null> {
  try {
    const c = await apiGet<ApiCustomer | null>(`/api/customers/nit/${encodeURIComponent(nit)}`);
    return c ?? null;
  } catch {
    return null;
  }
}

// ---------- Sales ----------

export const salesApi = {
  list: () => apiGet<ApiSale[]>('/api/sales'),
  create: (data: {
    customer: { name: string; email: string; nit: string };
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => apiPost<ApiSale>('/api/sales', data),
};

/** Convierte una venta de la API al formato que usa la UI (PDF, historial). */
export function toUiSale(s: ApiSale): Sale {
  return {
    id: s.invoiceNumber || s.id,
    date: s.createdAt,
    items: s.items.map((it) => ({
      id: it.productId,
      name: it.product?.name ?? 'Producto',
      price: Number(it.unitPrice),
      quantity: it.quantity,
      stock: 0,
      category: '',
      image: '',
    })),
    total: Number(s.total),
    customer: {
      name: s.customer?.name ?? 'Consumidor Final',
      email: s.customer?.email ?? '',
      nit: s.customer?.nit ?? '222222222',
    },
    paymentMethod: (s.payments?.[0]?.method as Sale['paymentMethod']) || 'cash',
  };
}

// ---------- Settings ----------

export const settingsApi = {
  get: () => apiGet<BusinessSettings>('/api/settings'),
  update: (data: Partial<BusinessSettings>) => apiPut<BusinessSettings>('/api/settings', data),
};

// ---------- AI ----------

export const aiApi = {
  invoiceEmail: (saleId: string) => apiPost<{ text: string }>('/api/ai/invoice-email', { saleId }),
  salesAnalysis: () => apiPost<{ text: string }>('/api/ai/sales-analysis'),
};
