// Cola offline de ventas pendientes + sincronización al reconectar.
// Las ventas que el servidor rechaza de forma permanente (4xx, ej. stock
// insuficiente) se mueven a una cola de "conflictos" para revisarlas:
// reintentarlas o descartarlas. Los fallos de red dejan la venta pendiente.

const QUEUE_KEY = 'pendingSalesQueue';
const REJECTED_KEY = 'rejectedSalesQueue';
export const SYNC_EVENT = 'simplepos:queue-synced';
export const REJECTED_EVENT = 'simplepos:queue-rejected';

export interface QueuedSale {
  id: string; // id local, ej. OFF-...
  createdAt: string;
  customer: { name: string; email: string; nit: string };
  items: { productId: string; quantity: number }[];
  paymentMethod: 'cash' | 'card' | 'transfer';
  /** Precio unitario por productId al momento de la venta (solo para mostrar totales en UI). */
  salePrice?: Record<string, number>;
}

/** Venta rechazada por el servidor, con el motivo. */
export interface RejectedSale {
  sale: QueuedSale;
  error: string; // mensaje legible, ej. "Insufficient stock for XYZ: 2 available"
  at: string; // fecha del rechazo
  status?: number; // código HTTP si se conoce (409, 400, ...)
}

function readQueue(): QueuedSale[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSale[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyServiceWorker(queue.length);
}

function notifyServiceWorker(count: number): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SIMPLEPOS_PENDING_SALES', count });
  }
}

// ---------- Cola de conflictos (ventas rechazadas por el servidor) ----------

export function readRejected(): RejectedSale[] {
  try {
    const raw = localStorage.getItem(REJECTED_KEY);
    return raw ? (JSON.parse(raw) as RejectedSale[]) : [];
  } catch {
    return [];
  }
}

function writeRejected(rejected: RejectedSale[]): void {
  localStorage.setItem(REJECTED_KEY, JSON.stringify(rejected));
  window.dispatchEvent(new CustomEvent(REJECTED_EVENT, { detail: { count: rejected.length } }));
}

/** Devuelve true si el error parece permanente (el servidor respondió algo distinto a red caída). */
export function isPermanentRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof TypeError) return false; // fetch falló: red/DNS/CORS → conectividad
  return true; // ApiError u otro Error del servidor → rechazo permanente
}

function recordRejection(sale: QueuedSale, error: unknown): void {
  const message =
    error instanceof Error && error.message ? error.message : 'Error desconocido del servidor';
  const status = typeof (error as { status?: number })?.status === 'number' ? (error as { status: number }).status : undefined;
  const rejected = readRejected();
  // Si ya estaba rechazada la misma venta, actualiza el motivo en su lugar.
  const existing = rejected.find((r) => r.sale.id === sale.id);
  const entry: RejectedSale = { sale, error: message, at: new Date().toISOString(), status };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    rejected.unshift(entry);
  }
  writeRejected(rejected);
}

export function getRejectedCount(): number {
  return readRejected().length;
}

export function getRejectedSales(): RejectedSale[] {
  return readRejected();
}

/**
 * Devuelve un rechazo a la cola pendiente (tras corregir stock, cliente, etc.).
 * Devuelve la venta reencolada o undefined si no existía.
 */
export function retryRejected(id: string): QueuedSale | undefined {
  const rejected = readRejected();
  const idx = rejected.findIndex((r) => r.sale.id === id);
  if (idx === -1) return undefined;
  const [entry] = rejected.splice(idx, 1);
  const queue = readQueue();
  if (!queue.some((s) => s.id === entry.sale.id)) queue.push(entry.sale);
  writeRejected(rejected);
  writeQueue(queue);
  return entry.sale;
}

/** Descarta definitivamente un conflicto. Devuelve la venta descartada o undefined. */
export function discardRejected(id: string): RejectedSale | undefined {
  const rejected = readRejected();
  const idx = rejected.findIndex((r) => r.sale.id === id);
  if (idx === -1) return undefined;
  const [entry] = rejected.splice(idx, 1);
  writeRejected(rejected);
  return entry;
}

/** Descarta todos los conflictos. */
export function clearRejected(): void {
  writeRejected([]);
}

// ---------- Cola pendiente y sincronización ----------

export function enqueueSale(sale: Omit<QueuedSale, 'id' | 'createdAt'>): string {
  const localId = `OFF-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
  const queued: QueuedSale = {
    id: localId,
    createdAt: new Date().toISOString(),
    ...sale,
  };
  const queue = readQueue();
  queue.push(queued);
  writeQueue(queue);
  return localId;
}

export function getPendingCount(): number {
  return readQueue().length;
}

export function getPendingSales(): QueuedSale[] {
  return readQueue();
}

/** Intenta enviar todas las ventas pendientes. Devuelve cuántas se sincronizaron. */
export async function syncPendingSales(
  sendSale: (sale: QueuedSale) => Promise<unknown>,
  onSynced?: (sale: QueuedSale) => void
): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedSale[] = [];
  let synced = 0;

  for (const sale of queue) {
    try {
      await sendSale(sale);
      synced += 1;
      onSynced?.(sale);
    } catch (error) {
      if (isPermanentRejection(error)) {
        // El servidor rechazó la venta (stock insuficiente, datos inválidos, etc.):
        // se saca de la cola de pendientes y pasa a conflictos para revisión.
        recordRejection(sale, error);
      } else {
        remaining.push(sale); // sigue pendiente: red caída
      }
    }
  }

  writeQueue(remaining);
  if (synced > 0) {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { synced } }));
  }
  return synced;
}

/** Registra los listeners de conectividad y background sync. */
export function initOfflineSync(
  sendSale: (sale: QueuedSale) => Promise<unknown>,
  onSynced?: (sale: QueuedSale) => void,
  onChange?: (status: { online: boolean; pending: number }) => void
): () => void {
  const emit = () => onChange?.({ online: navigator.onLine, pending: getPendingCount() });

  const doSync = () => {
    void syncPendingSales(sendSale, onSynced).finally(emit);
  };

  const handleOnline = () => {
    emit();
    doSync();
  };
  const handleOffline = () => emit();

  // Mensaje del service worker (background sync API).
  const handleSwMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SIMPLEPOS_RUN_SYNC') doSync();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  navigator.serviceWorker?.addEventListener('message', handleSwMessage);
  emit(); // estado inicial

  // Intento inicial si arrancó online con cola pendiente.
  if (navigator.onLine && getPendingCount() > 0) doSync();

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
  };
}
