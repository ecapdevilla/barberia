# Barbería El Corte — Sistema de Gestión

Frontend en Next.js 14 (App Router) + TypeScript + Tailwind, con datos locales en este momento. La misión de migración a Supabase está documentada para quien lo tome.

## Estructura

```
web/
├── src/
│   ├── app/              # layout.tsx, page.tsx, globals.css
│   ├── components/       # app-shell.tsx (toda la UI)
│   └── lib/              # types.ts, utils.ts, seed.ts
├── docs/                 # arquitectura.md, modelo-datos.md, migracion-supabase.md
├── .env.local.example
├── next.config.mjs
└── tailwind.config.ts
```

## Requisitos

- Node.js 20 (`node -v`)
- Git

## Instalación y ejecución

```bash
npm install
cp .env.local.example .env.local   # en Windows: copy .env.local.example .env.local
npm run dev
```

Abrir `http://localhost:3000`.

- Datos de prueba en `localStorage` (clave `barberia_el_corte_v1`). Para resetear, borrar esa clave en el navegador.
- Verificación rápida: `npx tsc --noEmit` y `npm run lint` deben pasar (1 warning conocido de `useEffect` en `app-shell.tsx:283`).

## Vistas

- Dashboard (ingresos servicios + productos)
- Agenda (timeline por barbero, slots 09:00–20:00 cada 30 min)
- Clientes (CRUD + búsqueda)
- Servicios (CRUD)
- Productos (inventario: precio, stock, categoría + alerta stock bajo)
- Ventas (POS: descuenta stock, suma a caja)
- Barberos
- Caja (movimientos unificados servicio/producto + cierre)
- Reportes (ingresos 7 días, rankings servicios y productos)

## Despliegue (Vercel)

1. Crear repositorio en GitHub y subir este proyecto (ver abajo).
2. En vercel.com → **Add New → Project** → importar el repositorio → Framework preset **Next.js** (root directory `web` si el repo es monorepo, o raíz si subes `web` como raíz).
3. En **Settings → Environment Variables** cargar `NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME`.
4. Deploy → la app debe cargar sin errores de consola. Sin claves de Supabase aún funciona con `localStorage`.

Notas: `npm run build` y `npm run dev` no deben correrse a la vez (corrompen `.next`). Para probar el build de producción, detén el dev server primero.

## Subir a Git y darle acceso a tu primo

```bash
cd web
git init
git add .gitignore src docs package.json package-lock.json *.json *.mjs *.ts *.md .nvmrc .env.local.example
git commit -m "feat: barberia next14 con productos y ventas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/barberia.git
git push -u origin main
```

En GitHub: repo → **Settings → Collaborators → Add people** (correo de tu primo, rol **Write**). Si es externo sin cuenta en el repo, mejor **Settings → Collaborators** con su usuario o **Invite a organización**.

En GitHub también activa **Settings → Branches → Add rule** para `main`: requerir PR + 1 review.

## Para tu primo con IA (copiar/pegar)

> Estoy migrando Barbería El Corte (Next.js 14 + TS + Tailwind en `web/`) a Supabase (Auth + DB + RLS). Lee primero `docs/arquitectura.md`, `docs/modelo-datos.md` y `docs/migracion-supabase.md`. El estado actual guarda en `localStorage` (clave `barberia_el_corte_v1`) con tipos en `src/lib/types.ts`. Primero verifica que `npm install && npm run dev` levanta en localhost:3000 y que `npx tsc --noEmit` pasa. Luego crea el proyecto Supabase, pega el SQL de `migracion-supabase.md`, configura `.env.local` (copiar de `.env.local.example`) y las variables en Vercel, y reemplaza el estado local por TanStack Query + Supabase manteniendo la UI y la validación anti-choque. No hardcodees URLs ni precios.

## Notas adicionales

- Para migrar a Supabase, seguir `docs/migracion-supabase.md` (tablas, RLS, middleware, envs).
- Para producción se necesita Auth real y RLS; el cambio de rol actual es simulado.
- Sin backend/RLS todavía no es apto para datos reales multi-usuario.
