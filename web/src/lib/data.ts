import { getSupabase } from "./supabase/client";
import type {
  AppState,
  Barbero,
  Cierre,
  Cita,
  Cliente,
  Pago,
  Producto,
  Profile,
  Servicio,
  Venta,
  VentaItem,
  Gasto,
} from "./types";
import { initials } from "./utils";

/* ------------------------------------------------------------------ */
/* Tipos de fila (snake_case) tal como vienen de Supabase             */
/* ------------------------------------------------------------------ */

type BarberoRow = { id: string; nombre: string; color: string | null; telefono: string | null; activo: boolean; comision_pct: number | null; organizacion_id: string | null };
type ServicioRow = { id: string; nombre: string; precio: number; duracion: number; activo: boolean };
type ProductoRow = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  activo: boolean;
  categoria: string | null;
};
type ClienteRow = { id: string; nombre: string; telefono: string; notas: string | null };
type CitaRow = {
  id: string;
  cliente_id: string;
  barbero_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  hora_fin: string;
  estado: string;
};
type PagoRow = { id: string; cita_id: string; monto: number; metodo: string; fecha: string };
type VentaItemRow = { producto_id: string | null; cantidad: number; precio_unitario: number };
type VentaRow = {
  id: string;
  fecha: string;
  total: number;
  metodo: string;
  cliente_id: string | null;
  barbero_id: string | null;
  cita_id: string | null;
  venta_items: VentaItemRow[] | null;
};
type CierreRow = {
  id: string;
  fecha: string;
  total_efe: number;
  total_digital: number;
  total_esperado: number;
  diferencia: number;
  notas: string | null;
  cerrado_en: string;
};
type GastoRow = {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  barbero_id: string | null;
  producto_id: string | null;
  cantidad: number;
  notas: string | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensure<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Respuesta vacía de Supabase");
  return data;
}

const mapBarbero = (r: BarberoRow): Barbero => ({
  id: r.id,
  nombre: r.nombre,
  color: r.color ?? "#8b5cf6",
  telefono: r.telefono ?? "",
  activo: r.activo,
  comisionPct: Number(r.comision_pct ?? 50),
  organizacionId: r.organizacion_id ?? undefined,
});

const mapServicio = (r: ServicioRow): Servicio => ({
  id: r.id,
  nombre: r.nombre,
  precio: Number(r.precio),
  duracion: Number(r.duracion),
  activo: r.activo,
});

const mapProducto = (r: ProductoRow): Producto => ({
  id: r.id,
  nombre: r.nombre,
  precio: Number(r.precio),
  stock: Number(r.stock),
  activo: r.activo,
  categoria: r.categoria ?? undefined,
});

const mapCliente = (r: ClienteRow): Cliente => ({
  id: r.id,
  nombre: r.nombre,
  telefono: r.telefono,
  notas: r.notas ?? "",
});

const mapCita = (r: CitaRow): Cita => ({
  id: r.id,
  clienteId: r.cliente_id,
  barberoId: r.barbero_id,
  servicioId: r.servicio_id,
  fecha: r.fecha,
  hora: r.hora,
  horaFin: r.hora_fin,
  estado: r.estado,
});

const mapPago = (r: PagoRow): Pago => ({
  id: r.id,
  citaId: r.cita_id,
  monto: Number(r.monto),
  metodo: r.metodo,
  fecha: r.fecha,
});

const mapVentaItem = (r: VentaItemRow): VentaItem => ({
  productoId: r.producto_id ?? "",
  cantidad: Number(r.cantidad),
  precioUnitario: Number(r.precio_unitario),
});

const mapVenta = (r: VentaRow): Venta => ({
  id: r.id,
  fecha: r.fecha,
  total: Number(r.total),
  metodo: r.metodo,
  clienteId: r.cliente_id,
  barberoId: r.barbero_id,
  citaId: r.cita_id,
  items: (r.venta_items ?? []).map(mapVentaItem),
});

const mapCierre = (r: CierreRow): Cierre => ({
  id: r.id,
  fecha: r.fecha,
  totalEfectivo: Number(r.total_efe),
  totalDigital: Number(r.total_digital),
  totalEsperado: Number(r.total_esperado),
  diferencia: Number(r.diferencia),
  notas: r.notas ?? "",
  cerradoEn: r.cerrado_en,
});

const mapGasto = (r: GastoRow): Gasto => ({
  id: r.id,
  fecha: r.fecha,
  concepto: r.concepto,
  categoria: r.categoria,
  monto: Number(r.monto),
  barberoId: r.barbero_id,
  productoId: r.producto_id,
  cantidad: Number(r.cantidad),
  notas: r.notas ?? "",
});

export function currentUserFromProfile(profile: Profile) {
  return {
    id: profile.id,
    nombre: profile.nombre,
    rol: profile.rol,
    avatar: initials(profile.nombre),
    barberoId: profile.barbero_id ?? undefined,
    organizacionId: profile.organizacion_id ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Lectura inicial                                                    */
/* ------------------------------------------------------------------ */

export async function loadAppState(profile: Profile): Promise<AppState> {
  const sb = getSupabase();

  const orgId = profile.organizacion_id;

  const [org, barberos, servicios, productos, clientes, citas, pagos, ventas, cierres, gastos] =
    await Promise.all([
      orgId ? sb.from("organizaciones").select("*").eq("id", orgId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      sb.from("barberos").select("*").order("nombre"),
      sb.from("servicios").select("*").order("nombre"),
      sb.from("productos").select("*").order("nombre"),
      sb.from("clientes").select("*").order("nombre"),
      sb.from("citas").select("*").order("fecha").order("hora"),
      sb.from("pagos").select("*").order("fecha"),
      sb.from("ventas").select("*, venta_items(*)").order("fecha"),
      sb.from("cierres_caja").select("*").order("fecha"),
      sb.from("gastos").select("*").order("fecha"),
    ]);

  const gastosData = gastos.error ? [] : (gastos.data ?? []);

  const orgData = (org as { data: { id: string; nombre: string; slug: string } | null }).data;

  return {
    currentUser: currentUserFromProfile(profile),
    organizacion: orgData ? { id: orgData.id, nombre: orgData.nombre, slug: orgData.slug } : null,
    barberos: (ensure(barberos.data, barberos.error) as BarberoRow[]).map(mapBarbero),
    servicios: (ensure(servicios.data, servicios.error) as ServicioRow[]).map(mapServicio),
    productos: (ensure(productos.data, productos.error) as ProductoRow[]).map(mapProducto),
    clientes: (ensure(clientes.data, clientes.error) as ClienteRow[]).map(mapCliente),
    citas: (ensure(citas.data, citas.error) as CitaRow[]).map(mapCita),
    pagos: (ensure(pagos.data, pagos.error) as PagoRow[]).map(mapPago),
    ventas: (ensure(ventas.data, ventas.error) as VentaRow[]).map(mapVenta),
    cierres: (ensure(cierres.data, cierres.error) as CierreRow[]).map(mapCierre),
    gastos: (gastosData as GastoRow[]).map(mapGasto),
  };
}

/* ------------------------------------------------------------------ */
/* Citas                                                              */
/* ------------------------------------------------------------------ */

export type CitaInput = {
  clienteId: string | null;
  barberoId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  horaFin: string;
  estado: string;
};

const citaToRow = (i: CitaInput) => ({
  cliente_id: i.clienteId || null,
  barbero_id: i.barberoId,
  servicio_id: i.servicioId,
  fecha: i.fecha,
  hora: i.hora,
  hora_fin: i.horaFin,
  estado: i.estado,
});

export async function createCita(input: CitaInput): Promise<string> {
  const { data, error } = await getSupabase()
    .from("citas")
    .insert(citaToRow(input))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No se pudo crear la cita");
  return data.id as string;
}

export async function updateCita(id: string, input: CitaInput) {
  const { error } = await getSupabase().from("citas").update(citaToRow(input)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCita(id: string) {
  const { error } = await getSupabase().from("citas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Pagos / Caja                                                       */
/* ------------------------------------------------------------------ */

export async function registrarPago(input: { citaId: string; monto: number; metodo: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("pagos").insert({
    cita_id: input.citaId,
    monto: input.monto,
    metodo: input.metodo,
  });
  if (error) throw new Error(error.message);

  const { error: citaError } = await sb
    .from("citas")
    .update({ estado: "atendida" })
    .eq("id", input.citaId);
  if (citaError) throw new Error(citaError.message);
}

export async function cerrarCaja(input: {
  fecha: string;
  totalEfectivo: number;
  totalDigital: number;
  totalEsperado: number;
  diferencia: number;
  notas: string;
}) {
  const { error } = await getSupabase()
    .from("cierres_caja")
    .upsert(
      {
        fecha: input.fecha,
        total_efe: input.totalEfectivo,
        total_digital: input.totalDigital,
        total_esperado: input.totalEsperado,
        diferencia: input.diferencia,
        notas: input.notas,
        cerrado_en: new Date().toISOString(),
      },
      { onConflict: "fecha" }
    );
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Clientes                                                           */
/* ------------------------------------------------------------------ */

export async function createCliente(input: { nombre: string; telefono: string; notas: string }) {
  const { error } = await getSupabase().from("clientes").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateCliente(
  id: string,
  input: { nombre: string; telefono: string; notas: string }
) {
  const { error } = await getSupabase().from("clientes").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCliente(id: string) {
  const { error } = await getSupabase().from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Servicios                                                          */
/* ------------------------------------------------------------------ */

export async function createServicio(input: { nombre: string; precio: number; duracion: number }) {
  const { error } = await getSupabase().from("servicios").insert({ ...input, activo: true });
  if (error) throw new Error(error.message);
}

export async function updateServicio(
  id: string,
  input: { nombre: string; precio: number; duracion: number }
) {
  const { error } = await getSupabase().from("servicios").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteServicio(id: string) {
  const { error } = await getSupabase().from("servicios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Productos                                                          */
/* ------------------------------------------------------------------ */

export async function createProducto(input: {
  nombre: string;
  precio: number;
  stock: number;
  categoria?: string;
}) {
  const { error } = await getSupabase().from("productos").insert({
    nombre: input.nombre,
    precio: input.precio,
    stock: input.stock,
    categoria: input.categoria ?? null,
    activo: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateProducto(
  id: string,
  input: { nombre: string; precio: number; stock: number; categoria?: string }
) {
  const { error } = await getSupabase()
    .from("productos")
    .update({
      nombre: input.nombre,
      precio: input.precio,
      stock: input.stock,
      categoria: input.categoria ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProducto(id: string) {
  const { error } = await getSupabase().from("productos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Ventas (RPC atómica)                                               */
/* ------------------------------------------------------------------ */

export async function crearVenta(input: {
  items: { productoId: string; cantidad: number }[];
  metodo: string;
  clienteId: string | null;
  barberoId: string | null;
  citaId: string | null;
}) {
  const { data, error } = await getSupabase().rpc("crear_venta", {
    p_items: input.items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    p_metodo: input.metodo,
    p_cliente_id: input.clienteId,
    p_barbero_id: input.barberoId,
    p_cita_id: input.citaId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/* ------------------------------------------------------------------ */
/* Barberos                                                           */
/* ------------------------------------------------------------------ */

export async function createBarbero(input: { nombre: string; color: string; telefono: string; comisionPct: number }) {
  const { error } = await getSupabase().from("barberos").insert({
    nombre: input.nombre,
    color: input.color,
    telefono: input.telefono,
    comision_pct: input.comisionPct,
    activo: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateBarbero(
  id: string,
  input: { nombre: string; color: string; telefono: string; comisionPct: number; activo: boolean }
) {
  const { error } = await getSupabase()
    .from("barberos")
    .update({
      nombre: input.nombre,
      color: input.color,
      telefono: input.telefono,
      comision_pct: input.comisionPct,
      activo: input.activo,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBarbero(id: string) {
  const { error } = await getSupabase().from("barberos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Gastos / Compras                                                   */
/* ------------------------------------------------------------------ */

export async function crearOrganizacion(nombre: string, slug: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("crear_organizacion", {
    p_nombre: nombre,
    p_slug: slug,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createGasto(input: {
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  barberoId: string | null;
  productoId: string | null;
  cantidad: number;
  notas: string;
}) {
  const { error } = await getSupabase().from("gastos").insert({
    fecha: input.fecha,
    concepto: input.concepto,
    categoria: input.categoria,
    monto: input.monto,
    barbero_id: input.barberoId,
    producto_id: input.productoId,
    cantidad: input.cantidad,
    notas: input.notas,
  });
  if (error) throw new Error(error.message);
}

export async function deleteGasto(id: string) {
  const { error } = await getSupabase().from("gastos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
