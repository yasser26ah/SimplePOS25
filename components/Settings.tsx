import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { settingsApi, type BusinessSettings } from '../src/api';
import toast from 'react-hot-toast';
import { Save, Store } from 'lucide-react';

const DEFAULTS: BusinessSettings = {
  storeName: 'Mi Tienda',
  nit: '',
  address: '',
  phone: '',
  taxRate: 0,
  lowStockThreshold: 10,
};

// Vista de configuración del negocio. Los datos alimentan facturas, PDFs y alertas.
export const Settings: React.FC = () => {
  const { dataMode } = useStore();
  const [form, setForm] = useState<BusinessSettings>(DEFAULTS);
  const [loading, setLoading] = useState(dataMode === 'api');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dataMode !== 'api') return;
    setLoading(true);
    settingsApi
      .get()
      .then((s) => setForm({ ...DEFAULTS, ...s }))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, [dataMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await settingsApi.update(form);
      setForm({ ...DEFAULTS, ...saved });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all';
  const label = 'block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5';

  if (loading) {
    return (
      <div className="p-8 h-full overflow-auto bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-auto bg-gray-50 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
        <p className="text-gray-500">Datos del negocio para facturación y reportes</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Store size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Datos del negocio</h3>
            <p className="text-xs text-gray-400">Aparecen en la tirilla y facturas PDF</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={label}>Nombre del negocio</label>
            <input
              required
              type="text"
              className={field}
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>NIT</label>
            <input
              type="text"
              className={field}
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
              placeholder="900.123.456-7"
            />
          </div>
          <div>
            <label className={label}>Dirección</label>
            <input
              type="text"
              className={field}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Teléfono</label>
            <input
              type="tel"
              className={field}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>IVA (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={field}
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={label}>Umbral de stock bajo</label>
            <input
              type="number"
              min={0}
              className={field}
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || dataMode !== 'api'}
          className="w-full md:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>

        {dataMode !== 'api' && (
          <p className="text-xs text-gray-400">
            Inicia sesión contra el servidor para guardar la configuración.
          </p>
        )}
      </form>
    </div>
  );
};
