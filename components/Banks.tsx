import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, DollarSign, CreditCard, Banknote } from 'lucide-react';

type PeriodType = 'daily' | 'weekly' | 'monthly';

export default function Banks() {
    const { sales } = useStore();
    const [period, setPeriod] = useState<PeriodType>('daily');

    const getDateKey = (date: Date, type: PeriodType): string => {
        if (type === 'daily') {
            return date.toISOString().split('T')[0];
        } else if (type === 'weekly') {
            const week = Math.floor(date.getDate() / 7);
            return `${date.getFullYear()}-W${week + 1}`;
        } else {
            return `${date.getFullYear()}-${date.getMonth() + 1}`;
        }
    };

    const groupSalesByPeriod = (type: PeriodType) => {
        const grouped: { [key: string]: typeof sales } = {};
        sales.forEach((sale) => {
            const date = new Date(sale.date);
            const key = getDateKey(date, type);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(sale);
        });
        return grouped;
    };

    const calculateMetrics = () => {
        const grouped = groupSalesByPeriod(period);
        const today = new Date().toISOString().split('T')[0];
        const todaySales = grouped[today] || [];

        const totalByMethod = {
            cash: 0,
            card: 0,
            transfer: 0,
        };

        todaySales.forEach((sale) => {
            const amount = sale.total;
            if (sale.paymentMethod === 'cash') totalByMethod.cash += amount;
            else if (sale.paymentMethod === 'card') totalByMethod.card += amount;
            else if (sale.paymentMethod === 'transfer') totalByMethod.transfer += amount;
        });

        const totalAmount = Object.values(totalByMethod).reduce((a, b) => a + b, 0);

        return {
            totalAmount,
            totalTransactions: todaySales.length,
            byMethod: totalByMethod,
            data: [
                { method: 'Efectivo', value: totalByMethod.cash },
                { method: 'Tarjeta', value: totalByMethod.card },
                { method: 'Transferencia', value: totalByMethod.transfer },
            ].filter((d) => d.value > 0),
        };
    };

    const metrics = calculateMetrics();
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Cuadre de Caja</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriod('daily')}
                        className={`px-4 py-2 rounded ${period === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        Diario
                    </button>
                    <button
                        onClick={() => setPeriod('weekly')}
                        className={`px-4 py-2 rounded ${period === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        Semanal
                    </button>
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={`px-4 py-2 rounded ${period === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        Mensual
                    </button>
                </div>
            </div>

            {/* Resumen de Hoy */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Ventas</p>
                            <p className="text-2xl font-bold">${metrics.totalAmount.toFixed(2)}</p>
                        </div>
                        <DollarSign className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Efectivo</p>
                            <p className="text-2xl font-bold">${metrics.byMethod.cash.toFixed(2)}</p>
                        </div>
                        <Banknote className="text-green-600" size={32} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tarjeta</p>
                            <p className="text-2xl font-bold">${metrics.byMethod.card.toFixed(2)}</p>
                        </div>
                        <CreditCard className="text-blue-600" size={32} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Transacciones</p>
                            <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
                        </div>
                        <Calendar className="text-orange-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - Distribución por método */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Distribución por Método de Pago</h2>
                    {metrics.data.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={metrics.data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ method, value }) => `${method}: $${value.toFixed(2)}`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {metrics.data.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Sin datos para hoy</p>
                    )}
                </div>

                {/* Bar Chart - Comparativa */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Ventas por Método</h2>
                    {metrics.data.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={metrics.data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="method" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                                <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Sin datos para hoy</p>
                    )}
                </div>
            </div>
        </div>
    );
}