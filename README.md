# SimplePOS

Sistema de Punto de Venta (POS) con facturación, inventario, contabilidad y caja.
**Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
**Backend:** Node.js + Express + Prisma + PostgreSQL (carpeta `server/`).

## 🚀 Arranque rápido (desarrollo)

### Frontend

```bash
pnpm install          # o npm install
cp .env.example .env  # opcional: define VITE_API_URL si tu backend no está en :3000
pnpm dev              # http://localhost:3000
```

### Backend

```bash
cd server
npm install
cp .env.example .env  # configura DATABASE_URL (PostgreSQL)
npm run db:generate
npm run db:migrate    # crea las tablas
npm run db:seed       # datos iniciales (roles, categorías, productos, caja)
npm run dev           # http://localhost:3000 (API)
```

**Credenciales iniciales:** `admin@simplepos.com` / `admin123` (cámbialas en producción).

> Si no hay backend disponible, la app sigue funcionando en **modo local** con `localStorage`
> (los datos no se sincronizan entre dispositivos).

## ☁️ Despliegue

- **Frontend:** Cloudflare Pages — build `npm run build`, salida `dist`, variable `VITE_API_URL` apuntando a la API.
- **Backend:** Railway/Fly con PostgreSQL gestionado — ver `server/README.md` y el `Dockerfile` incluido.

## 📄 Licencia

MIT
