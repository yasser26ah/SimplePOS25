import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleSlash,
  RotateCcw,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getRejectedSales, type RejectedSale } from '../src/sync';

const STATUS_LABELS: Record<string, string> = {
  400: 'Datos de la venta inválidos',
  401: 'Sesión expirada',
  403: 'Sin permisos para registrar la venta',
  404: 'Producto ya no existe en el servidor',
  409: 'Conflicto de stock',
};

const nf = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });

function paymentLabel(method?: string): string {
  if (method === 'card') return 'Tarjeta';
  if (method === 'transfer') return 'Transferencia';
  return 'Efectivo';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const Conflicts: React.FC = () => {
  const { retrySale, discardSale, discardAllConflicts, online, syncing } = useStore();
  const [refresh, setRefresh] = useState(0);
  // La cola vive en localStorage; refresh fuerza relectura tras cada acción.
  const rejected: RejectedSale[] = React.useMemo(
    () => getRejectedSales(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh]
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRetry = (id: string) => {
    setRefresh((n) => n + 1);
    retrySale(id);
  };

  const handleDiscard = (id: string) => {
    setRefresh((n) => n + 1);
    discardSale(id);
  };

  const handleDiscardAll = () => {
    setRefresh((n) => n + 1);
    discardAllConflicts();
  };

  const canSync = online && !syncing;

  if (rejected.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-800">Sin conflictos</h2>
          <p className="mt-2 text-sm text-gray-500">
            No hay ventas rechazadas por el servidor. Las ventas sin conexión se envían
            automáticamente al reconectar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={26} className="text-amber-500" />
            Ventas con conflicto
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {rejected.length} venta(s) rechazada(s) por el servidor. Revisa el motivo y decide:
            reintentarlas o descartarlas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscardAll}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            Descartar todas
          </button>
        </div>
      </div>

      {/* Lista de conflictos */}
      <div className="space-y-3">
        {rejected.map((r) => {
          const isOpen = expanded.has(r.sale.id);
          const total = r.sale.items.reduce((sum, it) => {
            const price = r.sale.salePrice?.[it.productId] ?? 0;
            return sum + price * it.quantity;
          }, 0);

          return (
            <div
              key={r.sale.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Motivo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-gray-800">{r.sale.id}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{formatDate(r.sale.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    {r.status === 409 ? (
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <CircleSlash size={16} className="text-red-400 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Motivo:</span> {r.error}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {STATUS_LABELS[String(r.status)] ?? 'Rechazo del servidor'}
                    {typeof r.status === 'number' ? ` (HTTP ${r.status})` : ''}
                  </p>
                </div>

                {/* Total + acciones */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">{nf.format(total)}</p>
                    <p className="text-xs text-gray-400">
                      {paymentLabel(r.sale.paymentMethod)} · {r.sale.items.length} ítem(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggle(r.sale.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      aria-label="Ver detalle"
                    >
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                      onClick={() => handleRetry(r.sale.id)}
                      disabled={!canSync}
                      title={
                        online
                          ? 'Devolver a la cola y sincronizar'
                          : 'Sin conexión: reintenta al reconectar'
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw size={16} /> Reintentar
                    </button>
                    <button
                      onClick={() => handleDiscard(r.sale.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} /> Descartar
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalle expandible */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Cliente</p>
                      <p className="font-medium text-gray-700">{r.sale.customer.name}</p>
                      <p className="text-xs text-gray-400">NIT {r.sale.customer.nit}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Pago</p>
                      <p className="font-medium text-gray-700">{paymentLabel(r.sale.paymentMethod)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Rechazada</p>
                      <p className="font-medium text-gray-700">{formatDate(r.at)}</p>
                      {r.status != null && (
                        <p className="text-xs text-gray-400">HTTP {r.status}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Ítems</p>
                    <ul className="space-y-1">
                      {r.sale.items.map((it, i) => (
                        <li
                          key={`${it.productId}-${i}`}
                          className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2"
                        >
                          <span className="text-sm text-gray-700 font-mono text-xs">
                            {it.productId.slice(0, 8)}…
                          </span>
                          <span className="text-sm text-gray-500">× {it.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota offline */}
      {!online && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
          <WifiOff size={16} />
          Estás sin conexión. Los reintentos se enviarán automáticamente al reconectar.
        </div>
      )}
    </div>
  );
};

export { Conflicts };
