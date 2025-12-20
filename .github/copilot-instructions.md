## Copilot / AI Agent instructions for SIMPLEPOS

Breve: SmartPOS es una SPA React + TypeScript (Vite) para un Punto de Venta local con estado en `localStorage` y una integración opcional de IA (@google/genai). Estas instrucciones ayudan a un agente de codificación a ser productivo rápidamente.

- **Cómo ejecutar**: usar `pnpm` (hay `pnpm-lock.yaml`) o `npm`.
  - Instalar: `pnpm install` o `npm install`
  - Desarrollo: `pnpm dev` o `npm run dev` (servidor Vite en `http://localhost:3000` por defecto)
  - Build/preview: `pnpm build` / `pnpm preview`

- **Variables de entorno relevantes**:
  - `GEMINI_API_KEY`: clave para la integración AI. Vite la expone como `process.env.GEMINI_API_KEY` y también como `process.env.API_KEY` mediante `vite.config.ts`.
  - Si no hay clave, `services/geminiService.ts` maneja la ausencia devolviendo mensajes de error, por lo que el app no crashea inmediatamente.

- **Arquitectura y flujos clave**:
  - Punto de entrada UI: [App.tsx](App.tsx) — envuelve `AppContent` con `StoreProvider`.
  - Estado global y persistencia: [context/StoreContext.tsx](context/StoreContext.tsx)
    - Guarda `products` y `sales` en `localStorage`.
    - Provee `useStore()` con acciones: `addToCart`, `completeSale`, `addProduct`, `updateProduct`, `deleteProduct`, etc.
    - `completeSale()` decrementa stock, agrega la venta a `sales` y limpia `cart`.
  - UI/layout: [components/Layout.tsx](components/Layout.tsx) — barra lateral y navegación por vistas.
  - Vistas principales: `components/POS.tsx`, `components/Inventory.tsx`, `components/Accounting.tsx`.
    - `POS.tsx` gestiona checkout y dispara `generateInvoiceEmail()` tras una venta.
  - IA: [services/geminiService.ts](services/geminiService.ts) — usa `@google/genai` y el modelo `gemini-2.5-flash` para generar correos y análisis.

- **Patrones y convenciones del proyecto**:
  - TypeScript con `jsx: react-jsx` y alias `@` a la raíz (ver `tsconfig.json` y `vite.config.ts`).
  - UI con Tailwind-like classes (ya en JSX). Iconos: `lucide-react`.
  - Datos iniciales: [constants.ts](constants.ts) contiene `INITIAL_PRODUCTS` y `APP_CURRENCY`.
  - Tipos centralizados en [types.ts](types.ts) (`Product`, `CartItem`, `Sale`, `Customer`, `ViewState`).

- **Edición/añadido de features — puntos de entrada recomendados**:
  - Lógica de negocio / persistencia: editar `context/StoreContext.tsx`.
  - Nuevas UI o cambios visuales: `components/*` (ej. `POS.tsx` para flujo de checkout).
  - Integración IA / prompts: `services/geminiService.ts` (prompts están embebidos — modificar con cuidado).

- **Depuración y pruebas manuales**:
  - Revisar `localStorage` (llaves `products`, `sales`) para estado persistente.
  - Logs: `services/geminiService.ts` registra errores con `console.error`.
  - Para probar IA sin clave: emular respuesta o probar ramas que devuelven texto de error.

- **Precauciones**:
  - No hay backend; las ventas y stock son locales (persistencia en `localStorage`). Evitar suposiciones sobre sincronización multi-usuario.
  - `GEMINI_API_KEY` debe mantenerse fuera del repositorio. Vite inyecta en tiempo de build/dev.

Si quieres, puedo: añadir ejemplos de PR descriptions, generar tests unitarios básicos (por ejemplo, para `StoreContext`), o refinar prompts en `services/geminiService.ts`. ¿Qué prefieres que mejore primero?
