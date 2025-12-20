import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Café Premium Tostado',
    price: 15.50,
    stock: 50,
    category: 'Bebidas',
    image: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    name: 'Tarta de Queso Artesanal',
    price: 8.00,
    stock: 20,
    category: 'Postres',
    image: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: '3',
    name: 'Sandwich Club',
    price: 12.00,
    stock: 35,
    category: 'Comidas',
    image: 'https://picsum.photos/200/200?random=3'
  },
  {
    id: '4',
    name: 'Jugo Natural de Naranja',
    price: 5.00,
    stock: 100,
    category: 'Bebidas',
    image: 'https://picsum.photos/200/200?random=4'
  },
  {
    id: '5',
    name: 'Croissant de Almendras',
    price: 4.50,
    stock: 40,
    category: 'Bollería',
    image: 'https://picsum.photos/200/200?random=5'
  }
];

export const APP_CURRENCY = '$';