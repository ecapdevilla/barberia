# Migración a Supabase — guía para tu primo

> **Actualización:** este proyecto NO crea un Supabase nuevo. Usa el proyecto
> existente (droguería) con un **schema aislado `barberia`**. Las migraciones ya
> están en `web/supabase/migrations/`:
> - `0001_init_barberia_schema.sql` → schema + tablas + seed + trigger de stock
> - `0002_rls_policies.sql` → perfiles, Auth y políticas RLS de producción
>
> Lee también `docs/supabase-barberia.md` (aislamiento, Auth compartida y cliente JS).
> La sección "Crear proyecto Supabase" de abajo queda solo como referencia si
> algún día se decide usar un proyecto dedicado.

## 0. Pre-requisitos
- Node 20 (`node -v`), `npm i -g supabase` (Supabase CLI), Git, cuenta en supabase.com y en Vercel.
- Clonar el repo y correr `npm install && npm run dev` para ver la UI actual (datos en `localStorage`).

## 1. Crear proyecto Supabase
1. Ir a supabase.com → New project → nombre `barberia-el-corte`.
2. Copiar URL, `anon key` y `service_role` a `.env.local` (copia `.env.local.example`).
3. En `.env.local` poner `NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL`.
4. En Vercel, cargar las mismas variables en Settings → Environment Variables (Production + Preview).

## 2. Crear tablas (SQL Editor o `supabase/migrations`)
Recomendado empezar con estas tablas (snake_case, ver `docs/modelo-datos.md`):

```sql
create table if not exists barberos (id uuid primary key default gen_random_uuid(), nombre text not null, color text, telefono text, activo boolean default true);
create table if not exists servicios (id uuid primary key default gen_random_uuid(), nombre text not null, precio int not null, duracion int not null, activo boolean default true);
create table if not exists productos (id uuid primary key default gen_random_uuid(), nombre text not null, precio int not null, stock int not null default 0 check (stock >= 0), activo boolean default true, categoria text);
create table if not exists clientes (id uuid primary key default gen_random_uuid(), nombre text not null, telefono text not null unique, notas text default '');
create table if not exists citas (id uuid primary key default gen_random_uuid(), cliente_id uuid references clientes(id) on delete cascade, barbero_id uuid references barberos(id), servicio_id uuid references servicios(id), fecha date not null, hora text not null, hora_fin text not null, estado text not null check (estado in ('pendiente','confirmada','atendida','no_show','cancelada')));
create table if not exists pagos (id uuid primary key default gen_random_uuid(), cita_id uuid references citas(id) on delete cascade, monto int not null, metodo text not null, fecha timestamptz default now());
create table if not exists ventas (id uuid primary key default gen_random_uuid(), fecha timestamptz default now(), total int not null, metodo text not null, cliente_id uuid references clientes(id), barbero_id uuid references barberos(id), cita_id uuid references citas(id));
create table if not exists venta_items (id uuid primary key default gen_random_uuid(), venta_id uuid references ventas(id) on delete cascade, producto_id uuid references productos(id), cantidad int not null check (cantidad > 0), precio_unitario int not null);
-- Anti-choque backend: índice único / constraint: mismo barbero+fecha sin solapamiento (usar vista o función de rango, o constraint temporal).
-- Trigger de stock: al insertar venta_items, decrementar productos.stock y fallar si < 0.
```

## 3. Auth + RLS
- Habilitar Auth (email + magic link o password). Crear tabla `profiles (id uuid PK references auth.users, rol text check (rol in ('admin','barbero')), barbero_id uuid)`.
- RLS: `admin` ve todo, `barbero` solo ve sus citas/ventas. El cambio de rol actual es simulado — reemplazar por ` profiles.rol`.
- Middleware: proteger `(app)` y refrescar sesión (ver scaffold de Supabase Next.js).

## 4. Migrar frontend (orden sugerido)
1. Instalar: `@supabase/supabase-js, zod, react-hook-form, @tanstack/react-query, zustand, date-fns, sonner`.
2. Crear `src/lib/supabase/{client,server,middleware,admin}.ts` y `src/lib/query-client.ts`.
3. Mover tipos de `src/lib/types.ts` a `src/types/database.ts` (generar con `supabase gen types typescript`).
4. Reemplazar `useState+localStorage` en `app-shell.tsx` por hooks TanStack Query por dominio (`use-clientes`, `use-servicios`, `use-productos`, `use-ventas`...). Mantener validación anti-choque en frontend y constraint SQL.
5. Si usas shadcn: `pnpm dlx shadcn@latest init` (o `npx shadcn@latest init`) y añadir `button, input, dialog, table, badge, card`.

## 5. Deploy
- Push a `main`, Vercel detecta Next y hace preview por PR y deploy en `main` (ver README → Despliegue).
- Verificar envs en Vercel y que la app carga sin errores de consola.

## Qué NO cambiar
- No renombrar `STORAGE_KEY` hasta migrar; el seed actual es la referencia de datos de prueba.
- No hardcodear URLs ni precios: usar `src/lib/constants` cuando se cree.
