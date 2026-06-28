# CristaleriaERP — Guía de configuración

## Requisitos
- Node.js 18 o superior
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis) para producción

---

## 1. Configurar Supabase (base de datos)

### 1a. Crear proyecto
1. Ve a https://supabase.com → **New project**
2. Ponle nombre (ej: `cristaleria-erp`), elige región **eu-west-3 (Paris)**
3. Guarda la contraseña de la base de datos

### 1b. Crear las tablas
1. En Supabase: **SQL Editor** → **New query**
2. Pega el contenido completo de `database/schema.sql`
3. Pulsa **Run**

### 1c. Obtener las credenciales
1. Supabase → **Settings** → **API**
2. Copia estos tres valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 1d. Crear el primer usuario
1. Supabase → **Authentication** → **Users** → **Add user**
2. Introduce el email y contraseña que usará tu suegro

---

## 2. Configurar en local

1. Copia el archivo de variables:
   ```
   .env.local  ← ya está creado, solo rellénalo
   ```

2. Edita `.env.local` y pon los tres valores de Supabase del paso 1c.

3. Instala dependencias (solo la primera vez):
   ```bash
   npm install
   ```

4. Arranca:
   ```bash
   npm run dev
   ```

5. Abre http://localhost:3000 y entra con el usuario creado en Supabase.

6. Ve a **Configuración** y rellena los datos de la empresa (nombre, NIF, IBAN, etc.)

---

## 3. Subir a Vercel (producción)

### 3a. Subir el código a GitHub
1. Crea un repositorio privado en GitHub
2. Sube el proyecto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU_USUARIO/cristaleria-erp.git
   git push -u origin main
   ```

### 3b. Conectar con Vercel
1. Ve a https://vercel.com → **New Project** → importa el repo de GitHub
2. En **Environment Variables** añade las mismas variables que en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → pon la URL de Vercel (ej: `https://cristaleria.vercel.app`)
3. Pulsa **Deploy**

### 3c. Después del deploy
- La URL pública estará disponible inmediatamente
- Cualquier cambio que subas a GitHub se desplegará automáticamente

---

## Estructura de la numeración

El proyecto está configurado para continuar desde donde dejó tu suegro:
- **Facturas**: empieza desde 1/41
- **Presupuestos**: empieza desde 1/139

Si necesitas cambiar el punto de inicio: Supabase → Table Editor → `configuracion_empresa` → edita los campos `siguiente_num_factura` y `siguiente_num_presupuesto`.

---

## Google Drive (opcional)

Si quieres que los PDFs también se guarden en Drive, necesitas configurar las variables `GOOGLE_*` en `.env.local`. Esto requiere crear un proyecto en Google Cloud Console. Por ahora la app funciona perfectamente sin Drive.
