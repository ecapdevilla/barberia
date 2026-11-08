"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Org = { id: string; nombre: string; slug: string; telefono?: string; direccion?: string };
type Barbero = { id: string; nombre: string; color: string; activo: boolean };
type Servicio = { id: string; nombre: string; precio: number; duracion: number; activo: boolean };

const SLOT_MIN = 30;
const START_HOUR = 9;
const END_HOUR = 20;

function toMin(hhmm: string) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function toHHMM(min: number) { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }
function fmtMoney(n: number) { return "$" + Number(n).toLocaleString("es-CO"); }

export default function ReservarPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  const [servicioId, setServicioId] = useState("");
  const [barberoId, setBarberoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ocupados, setOcupados] = useState<{ hora: string; hora_fin: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ barbero: string; servicio: string; fecha: string; hora: string; hora_fin: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/reservar/info?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Barbería no encontrada.");
        setOrg(data.org);
        setBarberos(data.barberos ?? []);
        setServicios(data.servicios ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const servicio = servicios.find((s) => s.id === servicioId);

  // Cargar slots ocupados cuando cambia barbero o fecha
  useEffect(() => {
    if (!slug || !barberoId || !fecha) {
      setOcupados([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/reservar/slots?slug=${encodeURIComponent(slug)}&barbero_id=${barberoId}&fecha=${fecha}`);
        const data = await res.json();
        if (res.ok) setOcupados(data.ocupados ?? []);
      } catch {
        setOcupados([]);
      }
    })();
  }, [slug, barberoId, fecha]);

  // slots disponibles
  const slots: string[] = [];
  if (fecha && barberoId && servicio) {
    const duracion = servicio.duracion;
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MIN) {
        const slotMin = h * 60 + m;
        const endSlot = slotMin + duracion;
        if (endSlot <= END_HOUR * 60) {
          const slotStr = toHHMM(slotMin);
          // verificar overlap con ocupados
          const overlap = ocupados.some((o) => {
            const os = toMin(o.hora);
            const oe = toMin(o.hora_fin);
            return slotMin < oe && endSlot > os;
          });
          if (!overlap) slots.push(slotStr);
        }
      }
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioId || !barberoId || !fecha || !hora || !nombre.trim() || !telefono.trim()) {
      setSubmitError("Completa todos los campos.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          barbero_id: barberoId,
          servicio_id: servicioId,
          fecha,
          hora,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo reservar.");
      setSuccess({
        barbero: data.barbero,
        servicio: data.servicio,
        fecha: data.fecha,
        hora: data.hora,
        hora_fin: data.hora_fin,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al reservar.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080d", color: "#f1f5f9" }}>
        <div>Cargando...</div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080d", color: "#f1f5f9", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Barbería no encontrada</h1>
          <p style={{ color: "#94a3b8" }}>{error || "Verifica el enlace."}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080d", color: "#f1f5f9", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>¡Cita agendada!</h1>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            Tu cita en <strong>{org.nombre}</strong> ha sido registrada.
          </p>
          <div style={{ background: "#12121c", border: "1px solid #262636", borderRadius: 16, padding: 20, textAlign: "left" }}>
            <div style={{ marginBottom: 8 }}><strong>Servicio:</strong> {success.servicio}</div>
            <div style={{ marginBottom: 8 }}><strong>Barbero:</strong> {success.barbero}</div>
            <div style={{ marginBottom: 8 }}><strong>Fecha:</strong> {success.fecha}</div>
            <div><strong>Hora:</strong> {success.hora} – {success.hora_fin}</div>
          </div>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 20 }}>
            Recibirás confirmación del equipo. Si necesitas cancelar, comunícate con la barbería.
          </p>
        </div>
      </div>
    );
  }

  // fecha mínima = hoy
  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div style={{ minHeight: "100vh", background: "#08080d", color: "#f1f5f9", padding: "24px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{org.nombre}</h1>
          <p style={{ color: "#94a3b8", marginTop: 4 }}>Reserva tu cita en línea</p>
          {org.direccion && <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{org.direccion}</p>}
        </div>

        <form onSubmit={submit} style={{ background: "#12121c", border: "1px solid #262636", borderRadius: 16, padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Servicio</label>
            <select
              value={servicioId}
              onChange={(e) => { setServicioId(e.target.value); setHora(""); }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1a1a27", border: "1px solid #262636", color: "#f1f5f9", fontSize: 14 }}
            >
              <option value="">Selecciona un servicio</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {fmtMoney(s.precio)} ({s.duracion} min)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Barbero</label>
            <select
              value={barberoId}
              onChange={(e) => { setBarberoId(e.target.value); setHora(""); }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1a1a27", border: "1px solid #262636", color: "#f1f5f9", fontSize: 14 }}
            >
              <option value="">Selecciona un barbero</option>
              {barberos.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fecha</label>
            <input
              type="date"
              min={hoy}
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setHora(""); }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1a1a27", border: "1px solid #262636", color: "#f1f5f9", fontSize: 14 }}
            />
          </div>

          {fecha && barberoId && servicioId && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hora disponible</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setHora(s)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid " + (hora === s ? "#8b5cf6" : "#262636"),
                      background: hora === s ? "rgba(139,92,246,0.2)" : "#1a1a27",
                      color: "#f1f5f9",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
                {slots.length === 0 && <span style={{ color: "#64748b", fontSize: 13 }}>Sin horarios disponibles para este día.</span>}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tu nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1a1a27", border: "1px solid #262636", color: "#f1f5f9", fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tu teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 123 4567"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1a1a27", border: "1px solid #262636", color: "#f1f5f9", fontSize: 14 }}
            />
          </div>

          {submitError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: 10, color: "#fca5a5", fontSize: 13, marginBottom: 14 }}>
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !hora}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: submitting ? "#64748b" : "linear-gradient(135deg,#8b5cf6,#ec4899)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Reservando..." : "Reservar cita"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginTop: 20 }}>
          {org.nombre} · Reservas en línea
        </p>
      </div>
    </div>
  );
}
