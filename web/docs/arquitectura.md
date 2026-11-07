# Arquitectura técnica

- **Stack real hoy:** Next.js 14.2.35 (App Router) + TypeScript 5 + Tailwind 3.4 + lucide-react. Estado en un solo componente cliente (`src/components/app-shell.tsx`) persistido en `localStorage`.
- **Stack objetivo (handoff):** Next.js 14 + TS + Tailwind + shadcn/ui + Supabase + Zod/RHForm + Zustand + TanStack Query. Ver `migracion-supabase.md` para el plan.
- **Rutas:** una sola página `/` que renderiza `AppShell` (vistas por estado interno: dashboard, agenda, clientes, servicios, productos, ventas, barberos, caja, reportes). Sin router de Next todavía.
- **Design tokens:** en `tailwind.config.ts` y `src/app/globals.css` (`--bg, --surface, --accent, ...`).
- **Persistencia:** `STORAGE_KEY = barberia_el_corte_v1`. Al cargar, se migra estado viejo sin `productos/ventas` completando con seed.
- **Reglas obligatorias al migrar:** Server Components por defecto, sin `any`, Zod como fuente de verdad, consultas vía TanStack Query, anti-choque duplicado (frontend + constraint SQL).
