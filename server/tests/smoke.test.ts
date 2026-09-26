import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Smoke tests: requieren un servidor corriendo en TEST_SERVER_URL (p. ej. `npm run dev`).
// Si no hay servidor, los tests se marcan como skip para no romper CI sin BD.

const BASE_URL = process.env.TEST_SERVER_URL ?? 'http://localhost:3000';

let serverAvailable = false;
const app: { current: Express | null } = { current: null };

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

afterAll(() => {
  app.current = null;
});

describe('Health', () => {
  it.skipIf(!serverAvailable)('GET /health responde 200', async () => {
    const res = await request(BASE_URL).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Auth flow', () => {
  it.skipIf(!serverAvailable)('rechaza credenciales inválidas', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@simplepos.com', password: 'wrong-password' });
    expect([401, 429]).toContain(res.status);
  });

  it.skipIf(!serverAvailable)('login + /me + venta end-to-end', async () => {
    const login = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@simplepos.com', password: 'admin123' });
    expect(login.status).toBe(200);
    const { accessToken } = login.body.data;
    expect(accessToken).toBeTruthy();

    const me = await request(BASE_URL)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('admin@simplepos.com');

    const products = await request(BASE_URL)
      .get('/api/products')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(products.status).toBe(200);
    const first = products.body.data[0];
    expect(first).toBeTruthy();

    const sale = await request(BASE_URL)
      .post('/api/sales')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customer: { name: 'Test Buyer', email: 'buyer@test.local', nit: '900000001' },
        items: [{ productId: first.id, quantity: 1 }],
        paymentMethod: 'cash',
      });
    expect(sale.status).toBe(201);
    expect(sale.body.data.total).toBeGreaterThan(0);
    expect(sale.body.data.invoiceNumber).toMatch(/^INV-/);
  });

  it.skipIf(!serverAvailable)('rechaza venta sin token', async () => {
    const res = await request(BASE_URL)
      .post('/api/sales')
      .send({ items: [] });
    expect(res.status).toBe(401);
  });
});
