import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { aiService } from '../services/ai.service';

const router = Router();

router.use(authenticate);

const invoiceEmailSchema = z.object({
  saleId: z.string().min(1),
});

// POST /api/ai/invoice-email — redacta el correo de la factura con IA (clave solo en el servidor)
router.post(
  '/invoice-email',
  validate(invoiceEmailSchema),
  asyncHandler(async (req, res) => {
    const { saleId } = req.body as { saleId: string };
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true } } } },
      },
    });
    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }
    const text = await aiService.generateInvoiceEmail({
      customerName: sale.customer.name,
      total: Number(sale.total),
      date: sale.createdAt.toISOString(),
      items: sale.items.map((i) => ({
        name: i.product?.name ?? 'Producto',
        quantity: i.quantity,
        price: Number(i.unitPrice),
      })),
    });
    res.json({ success: true, data: { text } });
  })
);

// POST /api/ai/sales-analysis — resumen ejecutivo de las ventas del periodo reciente
router.post(
  '/sales-analysis',
  asyncHandler(async (_req, res) => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: since }, status: 'COMPLETED' },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total), 0);
    const productCounts: Record<string, number> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const name = item.product?.name ?? 'Producto';
        productCounts[name] = (productCounts[name] ?? 0) + item.quantity;
      }
    }
    const topSellingProduct =
      Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

    const text = await aiService.analyzeSalesData({
      totalRevenue,
      totalSales: sales.length,
      topSellingProduct,
    });
    res.json({ success: true, data: { text } });
  })
);

export default router;
