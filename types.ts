export interface Product {
  //interface de producto
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  //Datos del cliente al vender
  name: string;
  email: string;
  nit: string; // Tax ID - ID impuestos
}

export interface Sale {
  //datos de la venta
  id: string;
  date: string; // ISO string
  items: CartItem[];
  total: number;
  customer: Customer;
  invoiceEmailContent?: string;
}

export type ViewState = 'POS' | 'INVENTORY' | 'ACCOUNTING' | 'BANKS'| 'config';

export interface SalesSummary {
  //resumen de ventas en contabilidad
  totalRevenue: number;
  totalSales: number;
  topSellingProduct: string;
  dailySales: { date: string; amount: number }[];
}

export interface CompanyInfo {
  //datos de la empresa para modelo de factura
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
}