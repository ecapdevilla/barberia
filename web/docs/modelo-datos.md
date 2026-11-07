# Modelo de datos (actual, localStorage)

`src/lib/types.ts` — fuente de verdad. Clave de guardado: `barberia_el_corte_v1`.

- `Barbero { id, nombre, color, telefono, activo }`
- `Servicio { id, nombre, precio, duracion, activo }`
- `Producto { id, nombre, precio, stock, activo, categoria? }` — inventario vendible
- `Cliente { id, nombre, telefono, notas }`
- `Cita { id, clienteId, barberoId, servicioId, fecha (YYYY-MM-DD), hora (HH:MM), horaFin, estado }` — estados: `pendiente, confirmada, atendida, no_show, cancelada`
- `Pago { id, citaId, monto, metodo (efectivo|nequi|transferencia), fecha ISO }`
- `Venta { id, fecha ISO, items: { productoId, cantidad, precioUnitario }[], total, metodo, clienteId?, barberoId?, citaId? }`
- `Cierre { id, fecha, totalEfectivo, totalDigital, totalEsperado, diferencia, notas, cerradoEn }`
- `CurrentUser { id, nombre, rol (admin|barbero), avatar?, barberoId? }`

Reglas actuales:
- Anti-choque frontend (`hasOverlap` en `src/lib/utils.ts`): mismo barbero + misma fecha + rangos solapados, ignorando `cancelada/no_show`.
- Venta descuenta stock; valida `cantidad <= stock`.
- Caja suma `pagos + ventas` por método. Cierre compara efectivo esperado vs contado.
- Reportes suman pagos y ventas por día/barbero.

Migración a Supabase: usar estos tipos como base para tablas `barberos, servicios, productos, clientes, citas, pagos, venta_items, ventas, cierres_caja`. Ver `migracion-supabase.md`.
