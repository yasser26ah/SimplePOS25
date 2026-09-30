// Mock mínimo de la API SimplePOS SOLO para desarrollo/preview local.
// Uso: node scripts/mock-api.mjs  (escucha en el puerto 3000)
import http from 'http';

const PORT = 3000;
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Stock que el mock descuenta al vender (para probar 409 reales).
const stock = { 'PRD-CAF-001': 20, 'PRD-PAN-002': 10, 'PRD-AZU-003': 2 };
const names = { 'PRD-CAF-001': 'Café', 'PRD-PAN-002': 'Pan', 'PRD-AZU-003': 'Azúcar' };

function send(res, status, data) {
  const body = JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { message: data.message, ...(data.details ? { details: data.details } : {}) }) });
  res.writeHead(status, JSON_HEADERS);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  console.log(`${new Date().toISOString()} ${req.method} ${path}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    return res.end();
  }

  // Collect body
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};

    if (path === '/health') return send(res, 200, { ok: true });

    if (path === '/api/auth/login' && req.method === 'POST') {
      if (body.email === 'admin@simplepos.com' && body.password === 'admin123') {
        return send(res, 200, {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: { id: 'u-1', username: 'admin', email: 'admin@simplepos.com', role: 'ADMIN', isActive: true },
        });
      }
      return send(res, 401, { message: 'Credenciales inválidas' });
    }

    if (path === '/api/auth/me') {
      return send(res, 200, { id: 'u-1', username: 'admin', email: 'admin@simplepos.com', role: 'ADMIN', isActive: true });
    }

    if (path === '/api/auth/logout') return send(res, 200, null);

    if (path === '/api/products' && req.method === 'GET') {
      const products = Object.keys(stock).map((sku) => ({
        id: sku,
        name: names[sku],
        sku,
        price: sku === 'PRD-CAF-001' ? 25 : sku === 'PRD-PAN-002' ? 5 : 12,
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'General' },
        isActive: true,
        inventory: [{ quantity: stock[sku], minStock: 1 }],
      }));
      return send(res, 200, products);
    }

    if (path === '/api/categories') {
      return send(res, 200, [{ id: 'cat-1', name: 'General' }]);
    }

    if (path === '/api/sales' && req.method === 'GET') return send(res, 200, []);

    if (path === '/api/sales' && req.method === 'POST') {
      // Validar stock item por item, igual que el servidor real (409 + details).
      for (const it of body.items ?? []) {
        const available = stock[it.productId];
        if (available === undefined) {
          return send(res, 404, { message: `Product ${it.productId} not found` });
        }
        if (it.quantity > available) {
          return send(res, 409, {
            message: `Insufficient stock for ${it.productId}: ${available} available`,
            details: { sku: it.productId, available },
          });
        }
      }
      for (const it of body.items ?? []) stock[it.productId] -= it.quantity;

      const total = (body.items ?? []).reduce(
        (sum, it) => sum + (it.productId === 'PRD-CAF-001' ? 25 : it.productId === 'PRD-PAN-002' ? 5 : 12) * it.quantity,
        0
      );
      const now = new Date().toISOString();
      const sale = {
        id: `sale-${Date.now()}`,
        invoiceNumber: `INV-${now.slice(0, 10).replace(/-/g, '')}-0001`,
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        status: 'COMPLETED',
        createdAt: now,
        customer: { id: 'c-1', name: body.customer?.name ?? 'CF', email: body.customer?.email ?? '', nit: body.customer?.nit ?? 'C-F', isActive: true },
        items: (body.items ?? []).map((it, i) => ({
          id: `si-${i}`,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.productId === 'PRD-CAF-001' ? 25 : it.productId === 'PRD-PAN-002' ? 5 : 12,
          subtotal: (it.productId === 'PRD-CAF-001' ? 25 : it.productId === 'PRD-PAN-002' ? 5 : 12) * it.quantity,
          product: { id: it.productId, name: names[it.productId] ?? it.productId },
        })),
        payments: [{ id: 'pay-1', method: body.paymentMethod ?? 'cash', amount: total }],
      };
      return send(res, 201, sale);
    }

    if (path.startsWith('/api/customers/nit/')) return send(res, 200, null);

    if (path === '/api/customers' && req.method === 'POST') {
      return send(res, 201, { id: 'c-1', name: body.name ?? 'CF', email: body.email ?? '', nit: body.nit ?? 'C-F', isActive: true });
    }

    if (path === '/api/settings') {
      return send(res, 200, { storeName: 'Demo Store', nit: 'X', address: '', phone: '', taxRate: 12, lowStockThreshold: 2 });
    }

    return send(res, 404, { message: `Mock: ruta no implementada ${req.method} ${path}` });
  });
});

server.listen(PORT, () => console.log(`Mock API escuchando en http://localhost:${PORT}`));
