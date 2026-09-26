// Cola offline de ventas pendientes + sincronización al reconectar.

const QUEUE_KEY = 'pendingSalesQueue';
export const SYNC_EVENT = 'simplepos:queue-synced';

export interface QueuedSale {
  id: string; // id local, ej. OFF-...
  createdAt: string;
  customer: { name: string; email: string; nit: string };
  items: { productId: string; quantity: number }[];
  paymentMethod: 'cash' | 'card' | 'transfer';
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
    } catch {
      remaining.push(sale); // sigue pendiente: red caída, stock insuficiente, etc.
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
