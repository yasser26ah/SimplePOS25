import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { APP_CURRENCY } from '../constants';
import { Plus, Edit2, Trash2, X, Save, Table, Space, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const Inventory: React.FC = () => {
  const { products, sales, addProduct, updateProduct, deleteProduct } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    stock: 0,
    category: '',
    image: 'https://picsum.photos/200/200'
  });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const productStats = useMemo(() => {
    if (!selectedProduct) return null;
    const relevantSales = sales.filter(sale => sale.items.some(item => item.id === selectedProduct.id));
    const totalUnits = relevantSales.reduce((sum, sale) => {
      const item = sale.items.find(i => i.id === selectedProduct.id);
      return sum + (item?.quantity || 0);
    }, 0);
    const totalRevenue = relevantSales.reduce((sum, sale) => {
      const item = sale.items.find(i => i.id === selectedProduct.id);
      return sum + (item ? item.price * item.quantity : 0);
    }, 0);
    const dailyData = relevantSales.reduce((acc, sale) => {
      const date = new Date(sale.date).toISOString().split('T')[0];
      const item = sale.items.find(i => i.id === selectedProduct.id);
      const qty = item?.quantity || 0;
      if (!acc[date]) acc[date] = { date, units: 0 };
      acc[date].units += qty;
      return acc;
    }, {} as Record<string, { date: string; units: number }>);
    const chartData = Object.values(dailyData).sort((a, b) => (a as { date: string; units: number }).date.localeCompare((b as { date: string; units: number }).date));
    return { totalUnits, totalRevenue, chartData };
  }, [selectedProduct, sales]);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: 0,
        stock: 0,
        category: '',
        image: `https://picsum.photos/200/200?random=${Date.now()}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({ ...formData, id: editingProduct.id });
    } else {
      addProduct({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      deleteProduct(id);
    }
  };

  return (
    <div className="p-8 h-full overflow-auto bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
           <p className="text-gray-500">Gestión de productos y existencias</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition shadow-sm"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                    <span className="font-medium text-gray-800">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">{product.category}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{APP_CURRENCY}{product.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock} unids.
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">
                    {APP_CURRENCY}{(product.price * product.stock).toFixed(0)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => openModal(product)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No hay productos registrados.
          </div>
        )}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Análisis de Producto</h3>
        <select
          value={selectedProductId || ''}
          onChange={e => setSelectedProductId(e.target.value || null)}
          className="mb-4 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Selecciona un producto</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
        {productStats && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Total Unidades Vendidas</h4>
                <p className="text-2xl font-bold text-gray-800">{productStats.totalUnits}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Total Ingresos</h4>
                <p className="text-2xl font-bold text-gray-800">{APP_CURRENCY}{productStats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Ventas Diarias</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productStats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="units" fill="#8884d8" name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>  

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input 
                    required
                    type="number" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 mt-4">
                <Save size={18} /> Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};