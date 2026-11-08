import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta." },
      { status: 500 }
    );
  }

  // 1. Verificar que el llamador esté autenticado y sea admin
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await userClient
    .schema("barberia")
    .from("profiles")
    .select("rol, activo, organizacion_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.activo || profile.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const adminOrgId = profile.organizacion_id;
  if (!adminOrgId) {
    return NextResponse.json({ error: "El admin no tiene organización asignada." }, { status: 400 });
  }

  // 2. Validar body
  let body: { email?: string; password?: string; nombre?: string; rol?: string; barbero_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const nombre = (body.nombre ?? "").trim() || email.split("@")[0];
  const rol = body.rol === "admin" ? "admin" : "barbero";
  const barberoId = body.barbero_id || null;

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email válido y contraseña (mín. 8 caracteres) son obligatorios." },
      { status: 400 }
    );
  }

  // 3. Crear usuario en Auth (service role)
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "No se pudo crear el usuario." },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  const { error: profileInsertError } = await admin
    .schema("barberia")
    .from("profiles")
    .upsert(
      { id: userId, nombre, rol, barbero_id: barberoId, organizacion_id: adminOrgId, activo: true },
      { onConflict: "id" }
    );

  if (profileInsertError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Usuario creado pero falló el perfil: " + profileInsertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, user_id: userId, email, rol });
}
