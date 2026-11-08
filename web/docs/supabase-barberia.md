# Supabase: schema `barberia` en proyecto compartido

Este documento explica cómo convive la barbería con la droguería dentro del
**mismo proyecto Supabase**, qué se comparte y qué no.

## 1. Qué se comparte y qué está aislado

| Recurso | ¿Compartido? | Detalle |
|---|---|---|
| Base de datos (Postgres) | Sí | Mismo proyecto, misma URL y región. |
| Schema `public` (droguería) | No se toca | La barbería vive en `barberia`. |
| Schema `barberia` | Aislado | Tablas, funciones, policies y seed propios. |
| `auth.users` | **Sí, compartido** | Los usuarios existen a nivel de proyecto. |
| `auth.uid()` / JWT | Sí | El login es uno solo para el proyecto. |
| Storage | Compartido | No se usa en esta fase. |
| API (PostgREST) | Configuración de proyecto | Hay que exponer `barberia` (ver §3). |

### Interferencia real: ninguna a nivel de datos
`create schema if not exists barberia` no modifica `public` ni las tablas de la
droguería. Las policies RLS solo aplican a tablas de `barberia`.

### El único punto delicado: Auth es compartido
Supabase tiene **un solo `auth.users` por proyecto**. Consecuencias:

1. Un usuario creado para la droguería **puede iniciar sesión** en el proyecto.
2. Las tablas de la barbería están protegidas porque `barberia.is_staff()` exige
   una fila en `barberia.profiles`. Un usuario de la droguería no la tiene → **no
   ve nada de barbería**.
3. El sentido contrario **no lo controla este repo**: si la app de la droguería
   tiene RLS permisivo (o desactivado), un usuario de barbería podría ver datos
   de la droguería. Eso hay que revisarlo en el proyecto de la droguería.

**Recomendación para producción:** si las dos apps van a tener usuarios reales,
lo más limpio es un proyecto Supabase dedicado para la barbería. Si se comparte,
ambas apps deben exigir un perfil propio (`drogueria.profiles` y
`barberia.profiles`) para autorizar acceso.

## 2. Ejecutar migraciones (en este orden)

En Supabase Dashboard → **SQL Editor** del proyecto existente:

1. Pegar y ejecutar `web/supabase/migrations/0001_init_barberia_schema.sql`.
2. Pegar y ejecutar `web/supabase/migrations/0002_rls_policies.sql`.

Ambos scripts son re-ejecutables. Si se quiere partir de cero:

```sql
drop schema if exists barberia cascade;
```

## 3. Exponer el schema en la API

Dashboard → **Settings → API → Exposed schemas** → agregar `barberia` → Save.

Sin este paso, `supabase.from('clientes')` con `db.schema = 'barberia'` devuelve
error de schema no encontrado.

## 4. Crear el primer admin (bootstrap)

`0002` no crea triggers sobre `auth.users` (para no ensuciar usuarios de la
droguería). Los perfiles se crean explícitamente. En el SQL Editor:

```sql
-- 1) Asegúrate de tener el usuario creado en Authentication → Users.
-- 2) Crear/actualizar el perfil admin del dueño:
insert into barberia.profiles (id, nombre, rol)
select u.id,
       coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1)),
       'admin'
from auth.users u
where u.email = 'TU_CORREO@EJEMPLO.COM'
on conflict (id) do update set rol = 'admin', activo = true;
```

Vincular un barbero:

```sql
insert into barberia.profiles (id, nombre, rol, barbero_id)
select u.id, 'Carlos Ruiz', 'barbero',
       (select id from barberia.barberos where nombre = 'Carlos Ruiz')
from auth.users u
where u.email = 'CARLOS@EJEMPLO.COM'
on conflict (id) do update
  set rol = 'barbero',
      barbero_id = excluded.barbero_id,
      activo = true;
```

Verificar:

```sql
select p.nombre, p.rol, b.nombre as barbero, p.activo
from barberia.profiles p
left join barberia.barberos b on b.id = p.barbero_id;
```

## 5. Cliente JS apuntando al schema

```ts
// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "barberia" } }
);
```

- El cliente usa la **anon key** + la sesión del usuario logueado (role
  `authenticated`). Nunca la `service_role` en el navegador.
- La `service_role` solo para scripts de migración/administración.

## 6. Reglas de acceso implementadas

| Tabla | admin | barbero |
|---|---|---|
| `profiles` | todo | solo su propia fila |
| `barberos`, `servicios`, `productos` | CRUD | lectura |
| `clientes` | CRUD | lectura + crear/editar |
| `citas` | CRUD | solo las suyas (`barbero_id`) |
| `pagos` | CRUD | solo pagos de sus citas |
| `ventas` | CRUD | las suyas + ventas de mostrador (`barbero_id null`) |
| `venta_items` | CRUD | ítems de ventas que puede operar |
| `cierres_caja` | CRUD | sin acceso |

Además:
- `anon` no tiene acceso al schema (hay que iniciar sesión).
- Un usuario sin fila activa en `barberia.profiles` no ve nada.
- El stock se descuenta con un trigger `SECURITY DEFINER` y falla si no alcanza.

## 7. Verificación rápida post-deploy

```sql
-- ¿Existe todo?
select table_name from information_schema.tables
where table_schema = 'barberia' order by table_name;

-- ¿RLS activo?
select tablename, rowsecurity from pg_tables
where schemaname = 'barberia' order by tablename;

-- ¿Políticas creadas?
select tablename, policyname from pg_policies
where schemaname = 'barberia' order by tablename;
```

En la app, tras iniciar sesión con el admin: las 9 vistas deben cargar datos.
Si aparecen listas vacías, revisar en este orden: (1) schema expuesto,
(2) fila en `barberia.profiles`, (3) sesión activa en el cliente.
