import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  }

  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "Slug requerido." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org } = await admin
    .schema("barberia")
    .from("organizaciones")
    .select("id, nombre, slug, telefono, direccion")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Barbería no encontrada." }, { status: 404 });
  }

  const [barberosRes, serviciosRes] = await Promise.all([
    admin.schema("barberia").from("barberos").select("id, nombre, color, activo").eq("organizacion_id", org.id).eq("activo", true).order("nombre"),
    admin.schema("barberia").from("servicios").select("id, nombre, precio, duracion, activo").eq("organizacion_id", org.id).eq("activo", true).order("nombre"),
  ]);

  return NextResponse.json({
    org,
    barberos: barberosRes.data ?? [],
    servicios: serviciosRes.data ?? [],
  });
}
