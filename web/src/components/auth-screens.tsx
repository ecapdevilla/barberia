"use client";

import { useState } from "react";
import { Scissors, LogIn, LogOut, AlertTriangle, ShieldAlert, Loader2, Database } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <div className="auth-icon" style={{ marginBottom: 0 }}>
        <Scissors />
      </div>
      <div>
        <div className="auth-title">Barbería El Corte</div>
        <div className="auth-sub">Sistema de gestión</div>
      </div>
    </div>
  );
}

export function LoadingScreen({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="screen-center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="spinner" />
        <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

export function ConfigScreen() {
  return (
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-icon">
          <Database />
        </div>
        <div className="auth-title">Falta configurar Supabase</div>
        <div className="auth-sub" style={{ marginTop: 6 }}>
          Crea <code>web/.env.local</code> a partir de <code>.env.local.example</code> y define:
        </div>
        <pre
          style={{
            marginTop: 16,
            padding: 14,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--text-2)",
            overflowX: "auto",
            lineHeight: 1.7,
          }}
        >
          {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <div className="auth-footer">
          Después reinicia el servidor con <code>npm run dev</code>.
        </div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setError("Correo o contraseña incorrectos.");
        } else if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de entrar. Revisa tu bandeja.");
        } else {
          setError(authError.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-center">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <div className="auth-sub">
          Inicia sesión con el usuario que te creó el administrador en Supabase.
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-form">
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              disabled={loading}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? <Loader2 className="spin-icon" /> : <LogIn />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <div className="auth-footer">
          ¿Sin acceso? El administrador debe crear tu usuario en
          <br />
          Supabase → Authentication → Users y asignarte un perfil.
        </div>
      </form>
    </div>
  );
}

export function CreateOrgScreen({
  onCreated,
  onSignOut,
}: {
  onCreated: () => void;
  onSignOut: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!n || !s) {
      setError("Nombre y slug son obligatorios.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { crearOrganizacion } = await import("@/lib/data");
      await crearOrganizacion(n, s);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la barbería.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-center">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-icon">
          <Scissors />
        </div>
        <div className="auth-title">Crea tu barbería</div>
        <div className="auth-sub" style={{ marginTop: 6 }}>
          Es tu primera vez. Crea tu organización para empezar a gestionar tu barbería.
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-form">
          <div className="field">
            <label htmlFor="orgnombre">Nombre de la barbería</label>
            <input
              id="orgnombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Barbería El Corte"
              disabled={loading}
            />
          </div>
          <div className="field">
            <label htmlFor="orgslug">Slug (identificador único)</label>
            <input
              id="orgslug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ej: el-corte"
              disabled={loading}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creando..." : "Crear barbería"}
          </button>
        </div>

        <button className="btn btn-ghost" onClick={onSignOut} style={{ width: "100%", marginTop: 12 }}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

export function NoProfileScreen({
  email,
  error,
  onSignOut,
}: {
  email?: string;
  error?: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-icon" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
          <ShieldAlert />
        </div>
        <div className="auth-title">Usuario sin perfil de barbería</div>
        <div className="auth-sub" style={{ marginTop: 6 }}>
          Tu sesión existe, pero no tienes una fila activa en <code>barberia.profiles</code>.
          Por seguridad no puedes ver datos hasta que un administrador te asigne rol.
        </div>
        {email && <div className="auth-user">Sesión: {email}</div>}
        {error && (
          <div className="auth-error" style={{ marginTop: 14 }}>
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 11.5,
            color: "var(--text-2)",
            overflowX: "auto",
            lineHeight: 1.7,
          }}
        >
          {`insert into barberia.profiles (id, nombre, rol)\nselect id, email, 'admin' from auth.users\nwhere email = '${email ?? "tu@correo.com"}';\n\n-- luego: select * from barberia.profiles;`}
        </pre>
        <button className="btn btn-ghost" onClick={onSignOut} style={{ width: "100%", marginTop: 18 }}>
          <LogOut /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
