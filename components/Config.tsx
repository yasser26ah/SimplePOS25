import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { APP_CURRENCY } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { SalesSummary } from '../types';
import { Sparkles, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

export const Accounting: React.FC = () => {
  const { sales } = useStore();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stats = useMemo<SalesSummary>(() => {
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
    const totalSales = sales.length;

    const productCounts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    const topSellingProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Group sales by date for charts
    const salesByDate: Record<string, number> = {};
    sales.forEach(sale => {
      const date = new Date(sale.date).toLocaleDateString();
      salesByDate[date] = (salesByDate[date] || 0) + sale.total;
    });

    const dailySales = Object.entries(salesByDate).map(([date, amount]) => ({ date, amount }));

    return { totalRevenue, totalSales, topSellingProduct, dailySales };
  }, [sales]);

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Ingresos Totales</p>
              <h3 className="text-2xl font-bold text-gray-800">{APP_CURRENCY}{stats.totalRevenue.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.totalSales}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Más Vendido</p>
              <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{stats.topSellingProduct}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Result */}
      {aiAnalysis && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 animate-in fade-in duration-500">
          <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
            <Sparkles size={18} /> Análisis Inteligente
          </h4>
          <p className="text-indigo-800 leading-relaxed">
            {aiAnalysis}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Ingresos por Fecha</h3>
          <div className="h-64">
             {stats.dailySales.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${APP_CURRENCY}${val}`} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hay datos suficientes</div>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Tendencia de Ventas</h3>
          <div className="h-64">
            {stats.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hay datos suficientes</div>
            )}
          </div>
        </div>
      </div>

       {/* Transactions List */}
       <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Transacciones Recientes</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.slice(0, 5).map(sale => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-500">#{sale.id}</td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  <div className="font-medium">{sale.customer.name}</div>
                  <div className="text-xs text-gray-400">{sale.customer.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(sale.date).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-800 text-right">{APP_CURRENCY}{sale.total.toFixed(2)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
               <tr><td colSpan={4} className="p-6 text-center text-gray-400">Sin transacciones recientes</td></tr>
            )}
          </tbody>
        </table>
       </div>
    </div>
  );
};