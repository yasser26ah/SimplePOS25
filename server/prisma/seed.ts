import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with full access',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      description: 'Manager with limited admin access',
    },
  });

  const sellerRole = await prisma.role.upsert({
    where: { name: 'SELLER' },
    update: {},
    create: {
      name: 'SELLER',
      description: 'Sales representative',
    },
  });

  console.log('✅ Roles created');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@simplepos.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@simplepos.com',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create categories
  const categories = [
    { name: 'Bebidas', description: 'Bebidas y jugos' },
    { name: 'Comidas', description: 'Comidas y platos' },
    { name: 'Postres', description: 'Postres y dulces' },
    { name: 'Bollería', description: 'Panadería y bollería' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('✅ Categories created');

  // Create warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { name: 'Principal' },
    update: {},
    create: {
      name: 'Principal',
      location: 'Tienda Principal',
      isDefault: true,
    },
  });

  console.log('✅ Warehouse created');

  // Create products
  const products = [
    {
      name: 'Café Premium Tostado',
      description: 'Café de alta calidad',
      sku: 'CAF-001',
      price: 15.50,
      costPrice: 8.00,
      categoryName: 'Bebidas',
    },
    {
      name: 'Tarta de Queso',
      description: 'Tarta de queso artesanal',
      sku: 'POS-001',
      price: 8.00,
      costPrice: 4.00,
      categoryName: 'Postres',
    },
    {
      name: 'Sandwich Club',
      description: 'Sandwich triple',
      sku: 'COM-001',
      price: 12.00,
      costPrice: 6.00,
      categoryName: 'Comidas',
    },
    {
      name: 'Croissant de Almendras',
      description: 'Croissant relleno de almendras',
      sku: 'BOL-001',
      price: 4.50,
      costPrice: 2.00,
      categoryName: 'Bollería',
    },
  ];

  const categoryRecords = await prisma.category.findMany();
  const warehouseRecord = await prisma.warehouse.findUnique({ where: { id: warehouse.id } });

  for (const product of products) {
    const category = categoryRecords.find((c) => c.name === product.categoryName);
    if (category) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: {},
        create: {
          name: product.name,
          description: product.description,
          sku: product.sku,
          price: product.price,
          costPrice: product.costPrice,
          categoryId: category.id,
          imageUrl: `https://picsum.photos/200/200?random=${Math.random()}`,
        },
      });

      // Add to inventory
      const productRecord = await prisma.product.findUnique({ where: { sku: product.sku } });
      if (productRecord && warehouseRecord) {
        await prisma.inventoryItem.upsert({
          where: {
            productId_warehouseId: {
              productId: productRecord.id,
              warehouseId: warehouseRecord.id,
            },
          },
          update: {},
          create: {
            productId: productRecord.id,
            warehouseId: warehouseRecord.id,
            quantity: 100,
            minStock: 10,
            maxStock: 500,
          },
        });
      }
    }
  }

  console.log('✅ Products created');

  // Create default customer
  const customer = await prisma.customer.upsert({
    where: { nit: '222222222' },
    update: {},
    create: {
      name: 'Consumidor Final',
      email: 'consumidor@final.com',
      nit: '222222222',
    },
  });

  console.log('✅ Default customer created');

  // Create expense categories
  const expenseCategories = [
    { name: 'Servicios', description: 'Luz, agua, internet' },
    { name: 'Renta', description: 'Alquiler de local' },
    { name: 'Sueldos', description: 'Pago de empleados' },
    { name: 'Marketing', description: 'Publicidad y promoción' },
    { name: 'Mantenimiento', description: 'Reparaciones y mantenimiento' },
    { name: 'Otros', description: 'Gastos varios' },
  ];

  for (const cat of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('✅ Expense categories created');

  // Create accounting accounts
  const accounts = [
    { code: '1001', name: 'Caja', accountType: 'ASSET' },
    { code: '1002', name: 'Bancos', accountType: 'ASSET' },
    { code: '1101', name: 'Clientes', accountType: 'ASSET' },
    { code: '1201', name: 'Inventario', accountType: 'ASSET' },
    { code: '2001', name: 'Proveedores', accountType: 'LIABILITY' },
    { code: '3001', name: 'Capital', accountType: 'EQUITY' },
    { code: '4001', name: 'Ventas', accountType: 'REVENUE' },
    { code: '5001', name: 'Costo de Ventas', accountType: 'EXPENSE' },
    { code: '6001', name: 'Gastos Generales', accountType: 'EXPENSE' },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  console.log('✅ Accounting accounts created');

  // Create cash box
  await prisma.cashBox.upsert({
    where: { name: 'Caja Principal' },
    update: {},
    create: {
      name: 'Caja Principal',
      openingBalance: 500,
      currentBalance: 500,
    },
  });

  console.log('✅ Cash box created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
