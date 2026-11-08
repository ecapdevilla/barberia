import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    );
  }

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

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email y contraseña (mín. 6 caracteres) son obligatorios." },
      { status: 400 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Crear usuario en Auth
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

  // 2. Crear perfil en barberia.profiles
  const { error: profileError } = await admin
    .schema("barberia")
    .from("profiles")
    .upsert(
      { id: userId, nombre, rol, barbero_id: barberoId, activo: true },
      { onConflict: "id" }
    );

  if (profileError) {
    // rollback: borrar el usuario auth creado
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Usuario creado pero falló el perfil: " + profileError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, user_id: userId, email, rol });
}
