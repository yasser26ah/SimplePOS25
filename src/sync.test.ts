import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiError } from './api/client';
import {
  enqueueSale,
  getPendingCount,
  getPendingSales,
  syncPendingSales,
  getRejectedCount,
  getRejectedSales,
  retryRejected,
  discardRejected,
  clearRejected,
  isPermanentRejection,
  type QueuedSale,
} from './sync';

// Stub mínimo de DOM: sync.ts usa localStorage y window, pero nada más del browser.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, String(v));
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('window', { dispatchEvent: () => true });
});

const customer = { name: 'Cliente Test', email: 'test@demo.com', nit: '222222222' };

function enqueueTestSale(): QueuedSale {
  enqueueSale({
    customer,
    items: [{ productId: 'p1', quantity: 2 }],
    paymentMethod: 'cash',
  });
  const [sale] = getPendingSales();
  return sale;
}

describe('isPermanentRejection', () => {
  it('clasifica errores 4xx/5xx como permanentes y errores de red como temporales', () => {
    expect(isPermanentRejection(new TypeError('Failed to fetch'))).toBe(false);
    expect(isPermanentRejection(new ApiError('Insufficient stock for X: 1 available', 409))).toBe(true);
    expect(isPermanentRejection(new ApiError('Bad request', 400))).toBe(true);
    expect(isPermanentRejection(new Error('boom'))).toBe(true);
    expect(isPermanentRejection('boom')).toBe(false);
  });
});

describe('syncPendingSales', () => {
  it('mueve las ventas rechazadas por el servidor a conflictos con motivo y status', async () => {
    const rejected = enqueueTestSale();
    enqueueSale({ customer, items: [{ productId: 'p2', quantity: 1 }], paymentMethod: 'card' });
    const [, ok] = getPendingSales();

    const synced = await syncPendingSales(async (s) => {
      if (s.id === rejected.id) {
        throw new ApiError('Insufficient stock for CAF-1: 1 available', 409);
      }
      // la otra venta se sincroniza bien
    });

    expect(synced).toBe(1);
    expect(getPendingCount()).toBe(0);
    expect(getRejectedCount()).toBe(1);
    const [entry] = getRejectedSales();
    expect(entry.sale.id).toBe(rejected.id);
    expect(entry.status).toBe(409);
    expect(entry.error).toBe('Insufficient stock for CAF-1: 1 available');
    void ok;
  });

  it('mantiene las ventas en pendientes cuando falla la conectividad', async () => {
    enqueueTestSale();
    const synced = await syncPendingSales(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(synced).toBe(0);
    expect(getPendingCount()).toBe(1);
    expect(getRejectedCount()).toBe(0);
  });

  it('serializa pasadas concurrentes para no enviar cada venta dos veces', async () => {
    enqueueTestSale();
    let calls = 0;
    const [sale] = getPendingSales();

    // Tres llamadas simultáneas (como sync inicial + evento online + visibilitychange).
    await Promise.all([
      syncPendingSales(async () => {
        calls += 1;
      }),
      syncPendingSales(async () => {
        calls += 1;
      }),
      syncPendingSales(async () => {
        calls += 1;
      }),
    ]);

    // Solo una pasada encuentra la venta; las siguientes ven la cola vacía.
    expect(calls).toBe(1);
    void sale;
  });
});

describe('retryRejected / discardRejected / clearRejected', () => {
  it('retryRejected devuelve la venta a la cola pendiente', async () => {
    const sale = enqueueTestSale();
    await syncPendingSales(async () => {
      throw new ApiError('Insufficient stock for CAF-1: 1 available', 409);
    });
    expect(getRejectedCount()).toBe(1);
    expect(getPendingCount()).toBe(0);

    const back = retryRejected(sale.id);
    expect(back?.id).toBe(sale.id);
    expect(getPendingCount()).toBe(1);
    expect(getRejectedCount()).toBe(0);
  });

  it('discardRejected elimina el conflicto definitivamente', async () => {
    const sale = enqueueTestSale();
    await syncPendingSales(async () => {
      throw new ApiError('Insufficient stock for CAF-1: 1 available', 409);
    });

    const discarded = discardRejected(sale.id);
    expect(discarded?.sale.id).toBe(sale.id);
    expect(getRejectedCount()).toBe(0);
    expect(getPendingCount()).toBe(0);
  });

  it('devuelve undefined con ids inexistentes', () => {
    expect(retryRejected('nope')).toBeUndefined();
    expect(discardRejected('nope')).toBeUndefined();
  });

  it('clearRejected vacía la cola de conflictos', async () => {
    enqueueTestSale();
    await syncPendingSales(async () => {
      throw new ApiError('Bad request', 400);
    });
    expect(getRejectedCount()).toBe(1);
    clearRejected();
    expect(getRejectedCount()).toBe(0);
  });
});
