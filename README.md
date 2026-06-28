# CristaleriaERP

Sistema de facturación y gestión para cristalería. Stack: Next.js 14 + Supabase + Google Drive.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → API** y copia las claves
3. Rellena `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Ve a **SQL Editor** y ejecuta todo el contenido de `database/schema.sql`

5. Crea el usuario de acceso en **Authentication → Users → Add user**

### 3. Configurar Google Drive (opcional)

Si no necesitas Drive, ignora este paso. El PDF se genera y descarga directamente sin él.

Para activar Drive:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto → habilita **Google Drive API**
3. Crea credenciales **OAuth 2.0** (tipo: aplicación web)
4. Obtén el refresh token con el [OAuth Playground](https://developers.google.com/oauthplayground):
   - Scope: `https://www.googleapis.com/auth/drive`
5. Crea una carpeta "CristaleriaERP" en tu Drive y copia su ID (está en la URL)
6. Rellena en `.env.local`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
```

### 4. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y entra con el usuario que creaste en Supabase.

### 5. Desplegar en Vercel

```bash
# Instala Vercel CLI si no la tienes
npm i -g vercel

# Despliega
vercel

# Añade las variables de entorno en el dashboard de Vercel
# Settings → Environment Variables
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/          ← Página de login
│   ├── (dashboard)/           ← Todas las páginas protegidas
│   │   ├── page.tsx           ← Dashboard
│   │   ├── clientes/
│   │   ├── presupuestos/
│   │   ├── facturas/
│   │   └── configuracion/
│   └── api/
│       ├── pdf/factura/       ← Genera PDF de factura
│       ├── pdf/presupuesto/   ← Genera PDF de presupuesto
│       └── drive/             ← Sube a Google Drive
│
├── components/
│   ├── layout/                ← Sidebar + Header
│   ├── clientes/
│   ├── presupuestos/
│   ├── facturas/
│   ├── pdf/                   ← Templates PDF
│   ├── configuracion/
│   └── shared/                ← Componentes reutilizables
│
├── lib/
│   ├── supabase/              ← Clients (browser, server, middleware)
│   ├── drive/                 ← Google Drive client
│   └── validations/           ← Schemas Zod
│
└── types/index.ts             ← Todos los tipos TypeScript
```

---

## Flujo principal

```
Cliente → Presupuesto → [Aceptado] → Factura → [Cobrada]
```

- El botón **"Convertir en factura"** ejecuta la función SQL `convertir_presupuesto_a_factura()` — es una transacción: crea la factura, copia los items y marca el presupuesto como "facturado" en un solo paso.
- El PDF se genera on-demand en la API route y se sube a Supabase Storage.
- Google Drive es una copia secundaria con reintentos automáticos.

---

## Base de datos

El schema completo está en `database/schema.sql`. Incluye:

- Tablas: `configuracion_empresa`, `clientes`, `presupuestos`, `presupuesto_items`, `facturas`, `factura_items`
- Funciones: `generar_numero_factura()`, `generar_numero_presupuesto()`, `convertir_presupuesto_a_factura(uuid)`
- Triggers: `updated_at` automático en todas las tablas
- RLS habilitado: solo usuarios autenticados

---

## Checklist antes de entregar

- [ ] Login funciona
- [ ] Se puede crear un cliente en < 30 segundos
- [ ] Se puede crear un presupuesto con líneas en < 60 segundos
- [ ] Se puede convertir presupuesto en factura en 1 click
- [ ] El PDF se genera y descarga
- [ ] Las facturas pendientes se ven de un vistazo en el dashboard
- [ ] Funciona en móvil
- [ ] Los errores son claros (no técnicos)
