# SimplePOS Backend

Backend API para SimplePOS - Sistema de Punto de Venta

## 🚀 Tecnologías

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT con Refresh Tokens
- **Validación**: Zod
- **Rate Limiting**: express-rate-limit

## 📁 Estructura del Proyecto

```
server/
├── prisma/
│   ├── schema.prisma      # Schema de la base de datos
│   ├── migrations/        # Migraciones de la base de datos
│   └── seed.ts           # Datos iniciales
├── src/
│   ├── config/           # Configuraciones
│   │   ├── index.ts     # Variables de entorno
│   │   └── database.ts  # Cliente Prisma
│   ├── controllers/     # Controladores HTTP
│   ├── middlewares/     # Express middlewares
│   │   ├── auth.ts     # Autenticación JWT
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── validation.ts
│   ├── routes/         # Rutas de la API
│   ├── services/       # Lógica de negocio
│   ├── types/          # Tipos TypeScript
│   ├── utils/          # Utilidades
│   │   ├── AppError.ts
│   │   └── logger.ts
│   ├── app.ts         # Configuración Express
│   └── index.ts       # Entry point
├── .env.example       # Variables de entorno
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Instalación

```bash
# Instalar dependencias
cd server
npm install

# Copiar archivo de variables de entorno
cp .env.example .env

# Configurar DATABASE_URL en .env con tu conexión de PostgreSQL

# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar datos iniciales (opcional)
npm run db:seed

# Iniciar servidor en desarrollo
npm run dev
```

## 🔑 Credenciales de Desarrollo

Después de ejecutar el seed:
- **Email**: admin@simplepos.com
- **Password**: admin123

## 📡 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/refresh | Renovar token |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/products | Listar productos |
| POST | /api/products | Crear producto |
| GET | /api/products/:id | Obtener producto |
| PUT | /api/products/:id | Actualizar producto |
| DELETE | /api/products/:id | Eliminar producto |

### Ventas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/sales | Listar ventas |
| POST | /api/sales | Crear venta |
| GET | /api/sales/:id | Obtener venta |

### Inventario
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/inventory | Ver inventario |
| POST | /api/inventory/adjust | Ajustar inventario |

## 🔐 Variables de Entorno

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/simplepos"

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 📜 Scripts

```bash
npm run dev        # Desarrollo con hot reload
npm run build      # Compilar TypeScript
npm run start      # Producción
npm run db:generate # Generar cliente Prisma
npm run db:migrate  # Ejecutar migraciones
npm run db:seed    # Poblar datos iniciales
npm run db:studio  # Abrir Prisma Studio
```

## 📄 Licencia

MIT
