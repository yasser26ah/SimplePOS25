# Guía de Despliegue — SimplePOS Go-Live

Arquitectura: **frontend en Cloudflare Pages** + **API en Railway** + **PostgreSQL gestionado**.

```
[Usuario] → https://simplepos.pages.dev (Cloudflare Pages)
                    │  fetch /api/* con JWT
                    ▼
        https://simplepos-api.up.railway.app (Railway + Docker)
                    │  DATABASE_URL
                    ▼
              PostgreSQL (Railway/Neon)
```

---

## 1. Backend en Railway

### 1.1 Crear proyecto
1. Entra a [railway.app](https://railway.app) → **New Project**.
2. **Deploy from GitHub repo** → selecciona `yasser26ah/SimplePOS25`.
3. En *Settings* del servicio:
   - **Branch:** `release/go-live-v1` (o `main` tras el merge).
   - **Root Directory:** `server`.
   - Railway detecta el `server/Dockerfile` automáticamente.
4. **Variables** (pestaña Variables):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(se inyecta al añadir Postgres, ver 1.2)* |
| `JWT_SECRET` | cadena aleatoria larga (`openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | otra cadena aleatoria distinta |
| `CORS_ORIGIN` | URL de Pages, p. ej. `https://simplepos.pages.dev` |
| `GEMINI_API_KEY` | *(opcional)* clave de Google AI Studio |

### 1.2 Base de datos
1. En el mismo proyecto: **+ New → Database → PostgreSQL**.
2. En el servicio API, añade la variable `DATABASE_URL` con referencia
   `${{Postgres.DATABASE_URL}}` (Railway la resuelve solo).
3. El primer deploy ejecuta `prisma migrate deploy` (CMD del Dockerfile) y crea las tablas.

### 1.3 Seed inicial
En la CLI de Railway (o desde el dashboard → servicio → **Shell**):

```bash
npx prisma db seed
```

Crea roles, admin, categorías, productos de ejemplo, caja y plan de cuentas.

> ⚠️ **Después del primer login, cambia la contraseña del admin** (o desactiva el usuario
> seed y crea usuarios reales desde `POST /api/users`).

### 1.4 Dominio público
Settings → Networking → **Generate Domain** → anota la URL (p. ej.
`https://simplepos-api-production.up.railway.app`). Verifica: `GET /health` debe responder
`{"success":true,...}`.

---

## 2. Frontend en Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecciona el repo y configura:
   - **Production branch:** `release/go-live-v1` (o `main` tras el merge).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Environment variables** (Production y Preview):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://<tu-api>.up.railway.app` (sin `/` final) |

4. **Save and Deploy.** Obtendrás una URL `*.pages.dev`.
5. Vuelve a Railway y asegúrate de que `CORS_ORIGIN` coincida **exactamente** con la URL
   de Pages (protocolo incluido, sin `/` final).

---

## 3. Verificación end-to-end (checklist go-live)

- [ ] `GET https://<api>/health` → 200
- [ ] Login en la app con `admin@simplepos.com` (seed) → entra al POS
- [ ] **Configuración**: guardar datos reales del negocio (nombre, NIT, dirección, IVA)
- [ ] **Inventario**: crear producto real con SKU y stock
- [ ] **POS**: vender → elegir método de pago → confirmar
- [ ] Tirilla PDF descarga con datos del negocio
- [ ] **Caja**: el cuadre del día refleja la venta (efectivo/tarjeta/transferencia)
- [ ] **Contabilidad**: la venta aparece como asiento (Caja/Bancos al debe, Ventas al haber)
- [ ] Crear usuarios reales por rol (ADMIN/MANAGER/SELLER) y desactivar el admin seed
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` son aleatorios (no los de ejemplo)

## 4. Operación

- **Backups:** Railway Postgres incluye backups automáticos; descarga dumps periódicos
  (`pg_dump` desde el panel).
- **Logs:** Railway → servicio → Deployments → Logs.
- **Escalado:** la API es stateless; se puede escalar horizontalmente sin cambios.
- **Monitor:** añade un uptime monitor (p. ej. UptimeRobot) apuntando a `/health`.
