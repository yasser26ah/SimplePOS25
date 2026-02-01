## Copilot / AI Agent instructions for SIMPLEPOS

Breve: SIMPLEPOS es una SPA React + TypeScript (Vite) para un Punto de Venta local. El estado principal vive en `localStorage`; la IA es opcional y está centralizada en `services/geminiService.ts`.

### Comandos esenciales
- **Instalar dependencias:** `pnpm install` (o `npm install` si no usas pnpm)
- **Desarrollo:** `pnpm dev` (Vite, por defecto en http://localhost:3000)
- **Build / Preview:** `pnpm build` y `pnpm preview`

### Variables de entorno importantes
- `GEMINI_API_KEY` — usada por `services/geminiService.ts`. Está expuesta por `vite.config.ts` como `process.env.GEMINI_API_KEY` (y también `process.env.API_KEY`).
- Si no existe la clave, `geminiService` maneja la ausencia y devuelve errores amigables para que la app no crashee.

### Arquitectura y flujo clave (por qué importa)
- Entrada UI: [App.tsx](App.tsx) — envuelve la app con `StoreProvider`.
- Estado y lógica central: [context/StoreContext.tsx](context/StoreContext.tsx). Aquí están las reglas de negocio principales: `products`, `sales`, `cart` se persisten en `localStorage`; acciones expuestas: `addToCart`, `completeSale`, `addProduct`, `updateProduct`, `deleteProduct`.
- Checkout: [components/POS.tsx](components/POS.tsx) — ejecuta el flujo de cobro y llama a `generateInvoiceEmail()` (integración IA opcional).
- IA: [services/geminiService.ts](services/geminiService.ts) — encapsula llamadas a `@google/genai` y contiene los prompts. Cambios aquí afectan generación de emails y análisis.
- Datos iniciales y tipos: [constants.ts](constants.ts) y [types.ts](types.ts) (revisar `INITIAL_PRODUCTS`, `APP_CURRENCY` y los tipos `Product`, `Sale`, `CartItem`).

### Patrones y convenciones del repo
- TypeScript + React con `jsx: react-jsx`.
- Alias de importación `@` a la raíz (ver `tsconfig.json` y `vite.config.ts`) — preferir este alias para imports internos.
- Estilos: clases utility-style (Tailwind-like) en JSX; iconos via `lucide-react`.
- Persistencia: el app no tiene backend; todo se guarda en `localStorage` bajo llaves como `products` y `sales`. Evitar suponer sincronización multi-usuario.

### Dónde tocar cada cosa (ejemplos concretos)
- Cambios de estado/persistencia: editar [context/StoreContext.tsx](context/StoreContext.tsx).
- Ajustes en prompts o fallbacks de IA: editar [services/geminiService.ts](services/geminiService.ts).
- UI/flujo de checkout: editar [components/POS.tsx](components/POS.tsx) — aquí se invoca la creación de correos/IA tras completar una venta.
- Datos iniciales y monedas: [constants.ts](constants.ts).

### Integraciones externas y puntos de fallo
- `@google/genai` se usa opcionalmente; las llamadas pueden fallar sin `GEMINI_API_KEY`. `geminiService` ya incluye manejo básico de ausencia de clave.
- No existe servidor ni base de datos en runtime; la carpeta `database/` contiene SQL de referencia (`db_productos.sql`, etc.) pero no se aplica automáticamente.

### Desarrollo y depuración práctica
- Revisar `localStorage` para depurar estado (`products`, `sales`, `cart`).
- Logs relevantes: `console.error` en `services/geminiService.ts` y errores que provienen de `completeSale()`.
- Si necesitas reproducir IA sin clave: mockear `services/geminiService.ts` para devolver texto estático.

### Restricciones y precauciones
- No modificar la gestión de `localStorage` sin considerar migraciones; los usuarios del repo asumen la existencia de las llaves `products` y `sales`.
- Evitar exponer `GEMINI_API_KEY` en commits. Las variables de Vite se inyectan en build/dev.

### Tareas recomendadas para PRs pequeñas
- Para cambios de negocio: agrega/actualiza tests en torno a `context/StoreContext.tsx` (si necesitas, puedo generar tests básicos).
- Para cambios en IA: actualiza prompts en `services/geminiService.ts` y agrega un modo fallback legible cuando no haya clave.

### Archivos clave para revisar rápidamente
- [context/StoreContext.tsx](context/StoreContext.tsx)
- [services/geminiService.ts](services/geminiService.ts)
- [components/POS.tsx](components/POS.tsx)
- [constants.ts](constants.ts)
- [types.ts](types.ts)
- [vite.config.ts](vite.config.ts)

Si quieres, actualizo esta guía con: fragmentos de PR template, tests unitarios mínimos para `StoreContext`, o ejemplos de prompts mejorados en `geminiService.ts`. ¿Qué prefieres que haga a continuación?
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
