import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  }

  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  const barberoId = req.nextUrl.searchParams.get("barbero_id") ?? "";
  const fecha = req.nextUrl.searchParams.get("fecha") ?? "";

  if (!slug || !barberoId || !fecha) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org } = await admin
    .schema("barberia")
    .from("organizaciones")
    .select("id")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Barbería no encontrada." }, { status: 404 });
  }

  const { data: citas } = await admin
    .schema("barberia")
    .from("citas")
    .select("hora, hora_fin")
    .eq("organizacion_id", org.id)
    .eq("barbero_id", barberoId)
    .eq("fecha", fecha)
    .not("estado", "in", "(cancelada,no_show)");

  return NextResponse.json({ ocupados: citas ?? [] });
}
