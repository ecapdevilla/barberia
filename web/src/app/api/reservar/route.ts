import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Rate limiting simple en memoria (por IP). Para producción usar Upstash/Redis.
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10; // reservas por ventana
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Demasiadas reservas. Intenta más tarde." },
      { status: 429 }
    );
  }

  let body: {
    slug?: string;
    barbero_id?: string;
    servicio_id?: string;
    fecha?: string;
    hora?: string;
    nombre?: string;
    telefono?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  const barberoId = body.barbero_id ?? "";
  const servicioId = body.servicio_id ?? "";
  const fecha = body.fecha ?? "";
  const hora = body.hora ?? "";
  const nombre = (body.nombre ?? "").trim();
  const telefono = (body.telefono ?? "").trim();

  if (!slug || !barberoId || !servicioId || !fecha || !hora || !nombre || !telefono) {
    return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  }

  // Validar formato de fecha (YYYY-MM-DD) y hora (HH:MM)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ error: "Formato de fecha/hora inválido." }, { status: 400 });
  }

  // Fecha no en el pasado
  const hoy = new Date().toISOString().split("T")[0];
  if (fecha < hoy) {
    return NextResponse.json({ error: "No se puede reservar en el pasado." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Resolver organización por slug
  const { data: org, error: orgError } = await admin
    .schema("barberia")
    .from("organizaciones")
    .select("id, nombre, activo")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Barbería no encontrada." }, { status: 404 });
  }

  const orgId = org.id;

  // 2. Validar barbero
  const { data: barbero } = await admin
    .schema("barberia")
    .from("barberos")
    .select("id, nombre, activo")
    .eq("id", barberoId)
    .eq("organizacion_id", orgId)
    .eq("activo", true)
    .maybeSingle();

  if (!barbero) {
    return NextResponse.json({ error: "Barbero no disponible." }, { status: 400 });
  }

  // 3. Validar servicio
  const { data: servicio } = await admin
    .schema("barberia")
    .from("servicios")
    .select("id, nombre, precio, duracion, activo")
    .eq("id", servicioId)
    .eq("organizacion_id", orgId)
    .eq("activo", true)
    .maybeSingle();

  if (!servicio) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 400 });
  }

  // 4. Verificar disponibilidad (sin overlap)
  const { data: citasExistentes } = await admin
    .schema("barberia")
    .from("citas")
    .select("hora, hora_fin, estado")
    .eq("barbero_id", barberoId)
    .eq("fecha", fecha)
    .eq("organizacion_id", orgId)
    .not("estado", "in", "(cancelada,no_show)");

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const toHHMM = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  const startMin = toMin(hora);
  const endMin = startMin + servicio.duracion;
  const horaFin = toHHMM(endMin);

  const overlap = (citasExistentes ?? []).some((c: { hora: string; hora_fin: string }) => {
    const s = toMin(c.hora);
    const e = toMin(c.hora_fin);
    return startMin < e && endMin > s;
  });

  if (overlap) {
    return NextResponse.json({ error: "Ese horario ya está ocupado. Elige otro." }, { status: 409 });
  }

  // 5. Buscar o crear cliente (por teléfono dentro de la org)
  let clienteId: string | null = null;
  const { data: clienteExistente } = await admin
    .schema("barberia")
    .from("clientes")
    .select("id")
    .eq("telefono", telefono)
    .eq("organizacion_id", orgId)
    .maybeSingle();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
  } else {
    const { data: nuevoCliente, error: clienteError } = await admin
      .schema("barberia")
      .from("clientes")
      .insert({ nombre, telefono, notas: "Reserva online", organizacion_id: orgId })
      .select("id")
      .single();
    if (clienteError || !nuevoCliente) {
      return NextResponse.json({ error: "No se pudo registrar el cliente." }, { status: 500 });
    }
    clienteId = nuevoCliente.id;
  }

  // 6. Crear la cita
  const { data: cita, error: citaError } = await admin
    .schema("barberia")
    .from("citas")
    .insert({
      cliente_id: clienteId,
      barbero_id: barberoId,
      servicio_id: servicioId,
      fecha,
      hora,
      hora_fin: horaFin,
      estado: "pendiente",
      origen: "online",
      organizacion_id: orgId,
    })
    .select("id")
    .single();

  if (citaError || !cita) {
    return NextResponse.json(
      { error: citaError?.message ?? "No se pudo crear la cita." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    cita_id: cita.id,
    barbero: barbero.nombre,
    servicio: servicio.nombre,
    fecha,
    hora,
    hora_fin: horaFin,
    organizacion: org.nombre,
  });
}
