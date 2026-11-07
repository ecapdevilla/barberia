"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppState } from "@/lib/types";
import { STORAGE_KEY, START_HOUR, END_HOUR, SLOT_MIN, SLOT_H, uid, fmtMoney, fmtDateLong, fmtDateShort, toMin, toHHMM, initials, byId, todayStr, hasOverlap } from "@/lib/utils";
import { createSeed } from "@/lib/seed";
import {
  Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight, Search,
  LayoutDashboard, Calendar, Users, Scissors, User, Wallet, BarChart3,
  Menu, CalendarDays, Banknote, Smartphone, ArrowLeftRight, DollarSign,
  Clock, XCircle, CheckCircle2, Info, AlertTriangle, Package, ShoppingBag
} from "lucide-react";

const VIEW_META: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Resumen del día" },
  agenda: { title: "Agenda", sub: "Citas por barbero" },
  clientes: { title: "Clientes", sub: "Base de datos" },
  servicios: { title: "Servicios", sub: "Catálogo y precios" },
  productos: { title: "Productos", sub: "Inventario y precios" },
  ventas: { title: "Ventas", sub: "Venta de productos" },
  barberos: { title: "Barberos", sub: "Equipo de trabajo" },
  caja: { title: "Caja", sub: "Cobros y cierre del día" },
  reportes: { title: "Reportes", sub: "Métricas del negocio" },
};

type Toast = { id: string; msg: string; type: "success" | "error" | "info" };

export default function AppShell() {
  const [state, setState] = useState<AppState>(() => createSeed());
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [agendaDate, setAgendaDate] = useState(() => todayStr());
  const [modal, setModal] = useState<React.ReactNode | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // load from localStorage on mount (+ migrate old state sin productos/ventas)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const seed = createSeed();
        const migrated: AppState = {
          ...seed,
          ...parsed,
          productos: parsed.productos ?? seed.productos,
          ventas: parsed.ventas ?? [],
        };
        setState(migrated);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // save on change
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, loaded]);

  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = uid("t");
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const openModal = useCallback((node: React.ReactNode) => setModal(node), []);
  const closeModal = useCallback(() => setModal(null), []);

  const today = todayStr();

  const switchRole = () => {
    const roles = [
      { rol: "admin", nombre: "Dueño", avatar: "D" },
      { rol: "barbero", nombre: "Carlos Ruiz", avatar: "CR", barberoId: "b1" },
    ];
    const current = state.currentUser.rol;
    const next = roles.find((r) => r.rol !== current)!;
    setState((s) => ({ ...s, currentUser: { id: "u1", ...next } }));
    toast(`Rol cambiado a ${next.rol}`, "info");
  };

  const setViewFn = (v: string) => {
    setView(v);
    setSidebarOpen(false);
  };

  // ---------- MODAL CONTENT BUILDERS ----------
  // We'll inline modal openers below.

  const renderSidebar = () => (
    <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
      <div className="brand">
        <div className="brand-logo">B</div>
        <div className="brand-text">
          <div className="brand-title">Barbería El Corte</div>
          <div className="brand-sub">Sistema de gestión</div>
        </div>
      </div>
      <div className="nav-section-label">Principal</div>
      <button className={"nav-item" + (view === "dashboard" ? " active" : "")} onClick={() => setViewFn("dashboard")}>
        <LayoutDashboard  />
        <span>Dashboard</span>
      </button>
      <button className={"nav-item" + (view === "agenda" ? " active" : "")} onClick={() => setViewFn("agenda")}>
        <Calendar  />
        <span>Agenda</span>
      </button>
      <button className={"nav-item" + (view === "clientes" ? " active" : "")} onClick={() => setViewFn("clientes")}>
        <Users  />
        <span>Clientes</span>
      </button>
      <div className="nav-section-label">Administración</div>
      <button className={"nav-item" + (view === "servicios" ? " active" : "")} onClick={() => setViewFn("servicios")}>
        <Scissors  />
        <span>Servicios</span>
      </button>
      <button className={"nav-item" + (view === "productos" ? " active" : "")} onClick={() => setViewFn("productos")}>
        <Package />
        <span>Productos</span>
      </button>
      <button className={"nav-item" + (view === "ventas" ? " active" : "")} onClick={() => setViewFn("ventas")}>
        <ShoppingBag />
        <span>Ventas</span>
      </button>
      <button className={"nav-item" + (view === "barberos" ? " active" : "")} onClick={() => setViewFn("barberos")}>
        <User  />
        <span>Barberos</span>
      </button>
      <button className={"nav-item" + (view === "caja" ? " active" : "")} onClick={() => setViewFn("caja")}>
        <Wallet  />
        <span>Caja</span>
      </button>
      <button className={"nav-item" + (view === "reportes" ? " active" : "")} onClick={() => setViewFn("reportes")}>
        <BarChart3  />
        <span>Reportes</span>
      </button>
      <div className="sidebar-footer">
        <div className="user-chip" onClick={switchRole} title="Cambiar rol">
          <div className="user-avatar" style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}>
            {state.currentUser.avatar || initials(state.currentUser.nombre)}
          </div>
          <div className="user-info">
            <div className="user-name">{state.currentUser.nombre}</div>
            <div className="user-role">{state.currentUser.rol === "admin" ? "Administrador" : "Barbero"}</div>
          </div>
        </div>
      </div>
    </aside>
  );

  // ---------- DASHBOARD ----------
  const todayCitas = state.citas.filter((c) => c.fecha === today && c.estado !== "cancelada");
  const atendidas = todayCitas.filter((c) => c.estado === "atendida").length;
  const ingresosPagos = state.pagos.filter((p) => p.fecha && p.fecha.startsWith(today)).reduce((a, p) => a + p.monto, 0);
  const ingresosVentas = state.ventas.filter((v) => v.fecha.startsWith(today)).reduce((a, v) => a + v.total, 0);
  const ingresos = ingresosPagos + ingresosVentas;
  const ocupacion = Math.round((todayCitas.length / (3 * 22 * 0.5)) * 100);
  const noShows = todayCitas.filter((c) => c.estado === "no_show").length;
  const nextCita = todayCitas
    .filter((c) => toMin(c.hora) >= new Date().getHours() * 60 + new Date().getMinutes() && c.estado !== "atendida")
    .sort((a, b) => toMin(a.hora) - toMin(b.hora))[0];

  const renderDashboard = () => (
    <div className="view">
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat-card">
          <div className="stat-icon purple"><Calendar  /></div>
          <div className="stat-label">Citas hoy</div>
          <div className="stat-value">{todayCitas.length}</div>
          <div className="stat-hint">{atendidas} atendidas</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon green"><DollarSign  /></div>
          <div className="stat-label">Ingresos hoy</div>
          <div className="stat-value">{fmtMoney(ingresos)}</div>
          <div className="stat-hint">{ingresos > 0 ? `Servicios ${fmtMoney(ingresosPagos)} · Productos ${fmtMoney(ingresosVentas)}` : "Aún sin cobros"}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon blue"><Clock  /></div>
          <div className="stat-label">Ocupación</div>
          <div className="stat-value">{ocupacion}%</div>
          <div className="stat-hint">Del total del día</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon pink"><XCircle  /></div>
          <div className="stat-label">No-show</div>
          <div className="stat-value">{noShows}</div>
          <div className="stat-hint">Citas perdidas</div>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Próxima cita</h3>
            {nextCita && <span className={"badge " + nextCita.estado}>{nextCita.estado}</span>}
          </div>
          {nextCita ? (() => {
            const cli = byId(state.clientes, nextCita.clienteId)!;
            const bar = byId(state.barberos, nextCita.barberoId)!;
            const svc = byId(state.servicios, nextCita.servicioId)!;
            return (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div className="avatar lg" style={{ background: bar.color }}>{initials(bar.nombre)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{cli.nombre}</div>
                    <div style={{ color: "var(--text-3)", fontSize: 13 }}>{svc.nombre} · con {bar.nombre}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: "var(--surface-2)", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>HORA</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{nextCita.hora} – {nextCita.horaFin}</div>
                  </div>
                  <div style={{ flex: 1, background: "var(--surface-2)", padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>PRECIO</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{fmtMoney(svc.precio)}</div>
                  </div>
                </div>
              </>
            );
          })() : <div className="empty" style={{ padding: 20 }}><p>No hay más citas hoy</p></div>}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Agenda por barbero hoy</h3>
          {state.barberos.map((b) => {
            const citas = todayCitas.filter((c) => c.barberoId === b.id);
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="avatar" style={{ background: b.color }}>{initials(b.nombre)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{b.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{citas.length} cita{citas.length !== 1 ? "s" : ""} hoy</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {fmtMoney(citas.reduce((a, c) => a + (byId(state.servicios, c.servicioId)?.precio || 0), 0))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ---------- AGENDA ----------
  const shiftDate = (delta: number) => {
    const d = new Date(agendaDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setAgendaDate(d.toISOString().split("T")[0]);
  };

  const openCitaModal = (editId: string | null = null, preselectBarbero: string | null = null, preselectFecha: string | null = null, preselectHora: string | null = null) => {
    const isEdit = !!editId;
    const cita = editId ? byId(state.citas, editId) : null;
    const clientesOpts = state.clientes;
    const barberosOpts = state.barberos;
    const serviciosOpts = state.servicios;

    const Modal = () => {
      const [clienteId, setClienteId] = useState(cita?.clienteId || state.clientes[0]?.id || "");
      const [barberoId, setBarberoId] = useState(cita?.barberoId || preselectBarbero || state.barberos[0]?.id || "");
      const [servicioId, setServicioId] = useState(cita?.servicioId || state.servicios[0]?.id || "");
      const [fecha, setFecha] = useState(cita?.fecha || preselectFecha || agendaDate);
      const [hora, setHora] = useState(cita?.hora || preselectHora || "10:00");
      const [estado, setEstado] = useState(cita?.estado || "pendiente");
      const [overlap, setOverlap] = useState(false);

      const svc = byId(state.servicios, servicioId);
      const validate = () => {
        if (!svc || !hora || !fecha) return;
        const startMin = toMin(hora);
        const endMin = startMin + (svc?.duracion || 0);
        const horaFin = toHHMM(endMin);
        const o = hasOverlap(state.citas, barberoId, fecha, hora, horaFin, editId);
        setOverlap(o);
      };
      useEffect(() => { validate(); }, [barberoId, servicioId, fecha, hora]);

      const save = () => {
        if (!svc) return;
        const startMin = toMin(hora);
        const horaFin = toHHMM(startMin + svc.duracion);
        if (hasOverlap(state.citas, barberoId, fecha, hora, horaFin, editId)) {
          toast("Este horario ya está ocupado", "error");
          return;
        }
        if (editId) {
          setState((s) => ({
            ...s,
            citas: s.citas.map((c) => c.id === editId ? { ...c, clienteId, barberoId, servicioId, fecha, hora, horaFin, estado } : c),
          }));
          toast("Cita actualizada", "success");
        } else {
          setState((s) => ({
            ...s,
            citas: [...s.citas, { id: uid("ap"), clienteId, barberoId, servicioId, fecha, hora, horaFin, estado }],
          }));
          toast("Cita creada", "success");
        }
        closeModal();
      };

      const del = () => {
        if (!confirm("¿Eliminar esta cita?")) return;
        setState((s) => ({ ...s, citas: s.citas.filter((c) => c.id !== editId) }));
        closeModal();
        toast("Cita eliminada", "info");
      };

      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">{isEdit ? "Editar cita" : "Nueva cita"}</div>
              <div className="modal-sub">{isEdit ? "Modifica los detalles" : "Agenda un nuevo turno"}</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X  /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label>Cliente</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                {clientesOpts.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.telefono}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Barbero</label>
              <select value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
                {barberosOpts.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Servicio</label>
              <select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                {serviciosOpts.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {fmtMoney(s.precio)} ({s.duracion}min)</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="field">
                <label>Hora inicio</label>
                <input type="time" value={hora} step={900} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="atendida">Atendida</option>
                <option value="no_show">No-show</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className={"error-text" + (overlap ? " show" : "")}><AlertTriangle /> Este horario ya está ocupado para este barbero.</div>
          </div>
          <div className="modal-footer">
            {isEdit && <button className="btn btn-danger btn-sm" onClick={del} style={{ marginRight: "auto" }}><Trash2 /> Eliminar</button>}
            <button className="btn btn-ghost" onClick={closeModal}><X  /> Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={overlap} style={overlap ? { opacity: 0.5, cursor: "not-allowed" } : {}}>{isEdit ? <><Check  /> Guardar cambios</> : <><Plus  /> Crear cita</>}</button>
          </div>
        </>
      );
    };

    openModal(<Modal />);
  };

  const openCitaDetail = (id: string) => {
    const c = byId(state.citas, id)!;
    const cli = byId(state.clientes, c.clienteId)!;
    const bar = byId(state.barberos, c.barberoId)!;
    const svc = byId(state.servicios, c.servicioId)!;
    const pago = state.pagos.find((p) => p.citaId === id);

    const Modal = () => (
      <>
        <div className="modal-header">
          <div>
            <div className="modal-title">{cli.nombre}</div>
            <div className="modal-sub">{svc.nombre} · {fmtMoney(svc.precio)}</div>
          </div>
          <button className="modal-close" onClick={closeModal}><X  /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 14, background: "var(--surface-2)", borderRadius: 12 }}>
            <div className="avatar" style={{ background: bar.color }}>{initials(bar.nombre)}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{bar.nombre}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Barbero</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>{c.hora} – {c.horaFin}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtDateShort(c.fecha)}</div>
            </div>
          </div>
          <div>
            <span className={"badge " + c.estado}>{c.estado}</span>
            {pago && <span className="badge atendida" style={{ marginLeft: 8 }}>Pagado {fmtMoney(pago.monto)}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {c.estado === "atendida" && !pago && (
              <button className="btn btn-success" onClick={() => { closeModal(); openPagoModal(id); }}><Check /> Registrar pago</button>
            )}
            <button className="btn btn-ghost" onClick={() => { closeModal(); openVentaModal(c.clienteId, c.barberoId, c.id); }}><ShoppingBag /> Vender producto</button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => deleteCita(id)} style={{ marginRight: "auto" }}><Trash2 /> Eliminar</button>
          <button className="btn btn-ghost" onClick={closeModal}><X /> Cerrar</button>
          <button className="btn btn-primary" onClick={() => { closeModal(); openCitaModal(id); }}><Pencil  /> Editar</button>
        </div>
      </>
    );
    openModal(<Modal />);
  };

  const deleteCita = (id: string) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    setState((s) => ({ ...s, citas: s.citas.filter((c) => c.id !== id) }));
    closeModal();
    toast("Cita eliminada", "info");
  };

  const openPagoModal = (citaId: string) => {
    const c = byId(state.citas, citaId)!;
    const svc = byId(state.servicios, c.servicioId)!;
    const cli = byId(state.clientes, c.clienteId)!;

    const Modal = () => {
      const [monto, setMonto] = useState(svc.precio);
      const [metodo, setMetodo] = useState("efectivo");
      const save = () => {
        if (!monto || monto <= 0) { toast("Monto inválido", "error"); return; }
        setState((s) => ({
          ...s,
          pagos: [...s.pagos, { id: uid("p"), citaId, monto, metodo, fecha: new Date().toISOString() }],
          citas: s.citas.map((x) => x.id === citaId ? { ...x, estado: "atendida" } : x),
        }));
        closeModal();
        toast("Pago registrado: " + fmtMoney(monto), "success");
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">Registrar pago</div>
              <div className="modal-sub">{cli.nombre} · {svc.nombre}</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X  /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label>Monto</label>
              <input type="number" value={monto} min={0} onChange={(e) => setMonto(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Método de pago</label>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X  /> Cancelar</button>
            <button className="btn btn-success" onClick={save}><Check  /> Cobrar</button>
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  const closeCajaFn = () => {
    const pagosHoy = state.pagos.filter((p) => p.fecha?.startsWith(today));
    const ventasHoy = state.ventas.filter((v) => v.fecha.startsWith(today));
    const movimientos = pagosHoy.length + ventasHoy.length;
    if (!movimientos) { toast("No hay movimientos para cerrar", "error"); return; }
    const totalEfec = pagosHoy.filter((p) => p.metodo === "efectivo").reduce((a, p) => a + p.monto, 0) + ventasHoy.filter((v) => v.metodo === "efectivo").reduce((a, v) => a + v.total, 0);
    const totalDig = pagosHoy.filter((p) => p.metodo !== "efectivo").reduce((a, p) => a + p.monto, 0) + ventasHoy.filter((v) => v.metodo !== "efectivo").reduce((a, v) => a + v.total, 0);

    const Modal = () => {
      const [contado, setContado] = useState(totalEfec);
      const [notas, setNotas] = useState("");
      const confirm = () => {
        const diff = contado - totalEfec;
        setState((s) => ({
          ...s,
          cierres: [...s.cierres, { id: uid("ci"), fecha: today, totalEfectivo: contado, totalDigital: totalDig, totalEsperado: totalEfec + totalDig, diferencia: diff, notas, cerradoEn: new Date().toISOString() }],
        }));
        closeModal();
        toast(diff === 0 ? "Caja cuadrada ✓" : `Diferencia: ${fmtMoney(diff)}`, diff === 0 ? "success" : "info");
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">Cerrar caja</div>
              <div className="modal-sub">{fmtDateLong(today)}</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X  /></button>
          </div>
          <div className="modal-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>EFECTIVO ESPERADO</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{fmtMoney(totalEfec)}</div>
              </div>
              <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>DIGITAL ESPERADO</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{fmtMoney(totalDig)}</div>
              </div>
            </div>
            <div className="field">
              <label>Efectivo contado en caja</label>
              <input type="number" value={contado} onChange={(e) => setContado(Number(e.target.value))} placeholder="0" />
            </div>
            <div className="field">
              <label>Notas (opcional)</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones del cierre..." />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X  /> Cancelar</button>
            <button className="btn btn-success" onClick={confirm}><Check  /> Cerrar caja</button>
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  // ---------- CLIENTES ----------
  const openClienteModal = (id: string | null = null) => {
    const c = id ? byId(state.clientes, id) : null;
    const Modal = () => {
      const [nombre, setNombre] = useState(c?.nombre || "");
      const [telefono, setTelefono] = useState(c?.telefono || "");
      const [notas, setNotas] = useState(c?.notas || "");
      const save = () => {
        const n = nombre.trim();
        const t = telefono.trim();
        if (!n || !t) { toast("Nombre y teléfono obligatorios", "error"); return; }
        const dup = state.clientes.find((x) => x.telefono === t && x.id !== id);
        if (dup) { toast("Teléfono ya registrado", "error"); return; }
        if (id) {
          setState((s) => ({ ...s, clientes: s.clientes.map((x) => x.id === id ? { ...x, nombre: n, telefono: t, notas: notas.trim() } : x) }));
          toast("Cliente actualizado", "success");
        } else {
          setState((s) => ({ ...s, clientes: [...s.clientes, { id: uid("c"), nombre: n, telefono: t, notas: notas.trim() }] }));
          toast("Cliente creado", "success");
        }
        closeModal();
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">{c ? "Editar cliente" : "Nuevo cliente"}</div>
              <div className="modal-sub">Datos de contacto</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X  /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label>Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 300 123 4567" />
            </div>
            <div className="field">
              <label>Notas</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Preferencias, alergias..." />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X  /> Cancelar</button>
            <button className="btn btn-primary" onClick={save}>{c ? <><Check  /> Guardar</> : <><Plus  /> Crear</>}</button>
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  const deleteCliente = (id: string) => {
    if (!confirm("¿Eliminar este cliente? También se eliminarán sus citas asociadas.")) return;
    setState((s) => ({ ...s, clientes: s.clientes.filter((c) => c.id !== id), citas: s.citas.filter((c) => c.clienteId !== id) }));
    toast("Cliente eliminado", "info");
  };

  // ---------- SERVICIOS ----------
  const openServicioModal = (id: string | null = null) => {
    const s = id ? byId(state.servicios, id) : null;
    const Modal = () => {
      const [nombre, setNombre] = useState(s?.nombre || "");
      const [precio, setPrecio] = useState(s?.precio || 25000);
      const [duracion, setDuracion] = useState(s?.duracion || 30);
      const save = () => {
        const n = nombre.trim();
        if (!n || !precio || !duracion) { toast("Completa todos los campos", "error"); return; }
        if (id) {
          setState((st) => ({ ...st, servicios: st.servicios.map((x) => x.id === id ? { ...x, nombre: n, precio, duracion } : x) }));
          toast("Servicio actualizado", "success");
        } else {
          setState((st) => ({ ...st, servicios: [...st.servicios, { id: uid("s"), nombre: n, precio, duracion, activo: true }] }));
          toast("Servicio creado", "success");
        }
        closeModal();
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">{s ? "Editar servicio" : "Nuevo servicio"}</div>
              <div className="modal-sub">Define nombre, precio y duración</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X  /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label>Nombre del servicio</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Corte clásico" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Precio (COP)</label>
                <input type="number" value={precio} min={0} step={1000} onChange={(e) => setPrecio(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Duración (min)</label>
                <input type="number" value={duracion} min={5} step={5} onChange={(e) => setDuracion(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X  /> Cancelar</button>
            <button className="btn btn-primary" onClick={save}>{s ? <><Check  /> Guardar</> : <><Plus  /> Crear</>}</button>
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  // ---------- PRODUCTOS ----------
  const openProductoModal = (id: string | null = null) => {
    const p = id ? byId(state.productos, id) : null;
    const Modal = () => {
      const [nombre, setNombre] = useState(p?.nombre || "");
      const [precio, setPrecio] = useState(p?.precio || 20000);
      const [stock, setStock] = useState(p?.stock || 10);
      const [categoria, setCategoria] = useState(p?.categoria || "");
      const save = () => {
        const n = nombre.trim();
        if (!n || precio <= 0 || stock < 0) { toast("Completa nombre, precio y stock válidos", "error"); return; }
        if (id) {
          setState((st) => ({ ...st, productos: st.productos.map((x) => x.id === id ? { ...x, nombre: n, precio, stock, categoria: categoria.trim() || undefined } : x) }));
          toast("Producto actualizado", "success");
        } else {
          setState((st) => ({ ...st, productos: [...st.productos, { id: uid("p"), nombre: n, precio, stock, categoria: categoria.trim() || undefined, activo: true }] }));
          toast("Producto creado", "success");
        }
        closeModal();
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">{p ? "Editar producto" : "Nuevo producto"}</div>
              <div className="modal-sub">Inventario de venta al público</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label>Nombre del producto</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Pomada mate" />
            </div>
            <div className="field">
              <label>Categoría (opcional)</label>
              <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: Peinado, Barba, Lavado" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Precio (COP)</label>
                <input type="number" value={precio} min={0} step={500} onChange={(e) => setPrecio(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Stock</label>
                <input type="number" value={stock} min={0} step={1} onChange={(e) => setStock(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X /> Cancelar</button>
            <button className="btn btn-primary" onClick={save}>{p ? <><Check /> Guardar</> : <><Plus /> Crear</>}</button>
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  const deleteProducto = (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setState((s) => ({ ...s, productos: s.productos.filter((x) => x.id !== id) }));
    toast("Producto eliminado", "info");
  };

  // ---------- VENTAS (POS) ----------
  const openVentaModal = (presetClienteId: string | null = null, presetBarberoId: string | null = null, presetCitaId: string | null = null) => {
    const activos = state.productos.filter((p) => p.activo);
    const Modal = () => {
      const [clienteId, setClienteId] = useState(presetClienteId || "");
      const [barberoId, setBarberoId] = useState(presetBarberoId || "");
      const [metodo, setMetodo] = useState("efectivo");
      const [cart, setCart] = useState<Record<string, number>>({});
      const total = Object.entries(cart).reduce((acc, [pid, qty]) => {
        const prod = byId(state.productos, pid);
        return acc + (prod ? prod.precio * qty : 0);
      }, 0);
      const sinStock = Object.entries(cart).some(([pid, qty]) => {
        const prod = byId(state.productos, pid);
        return prod ? qty > prod.stock : false;
      });
      const addQty = (pid: string, delta: number) => setCart((c) => {
        const next = Math.max(0, (c[pid] || 0) + delta);
        const copy = { ...c };
        if (next === 0) delete copy[pid]; else copy[pid] = next;
        return copy;
      });
      const save = () => {
        const items = Object.entries(cart).map(([productoId, cantidad]) => {
          const prod = byId(state.productos, productoId)!;
          return { productoId, cantidad, precioUnitario: prod.precio };
        }).filter((i) => i.cantidad > 0);
        if (!items.length) { toast("Agrega al menos un producto", "error"); return; }
        if (items.some((i) => { const prod = byId(state.productos, i.productoId)!; return i.cantidad > prod.stock; })) {
          toast("Stock insuficiente para un producto", "error"); return;
        }
        setState((s) => ({
          ...s,
          productos: s.productos.map((prod) => {
            const it = items.find((i) => i.productoId === prod.id);
            return it ? { ...prod, stock: Math.max(0, prod.stock - it.cantidad) } : prod;
          }),
          ventas: [...s.ventas, { id: uid("v"), fecha: new Date().toISOString(), items, total, metodo, clienteId: clienteId || null, barberoId: barberoId || null, citaId: presetCitaId }],
        }));
        closeModal();
        toast("Venta registrada: " + fmtMoney(total), "success");
      };
      return (
        <>
          <div className="modal-header">
            <div>
              <div className="modal-title">Nueva venta de producto</div>
              <div className="modal-sub">Se descuenta del inventario y suma a caja</div>
            </div>
            <button className="modal-close" onClick={closeModal}><X /></button>
          </div>
          <div className="modal-body">
            {activos.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}><p>No hay productos activos. Crea uno primero.</p></div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activos.map((prod) => {
                    const qty = cart[prod.id] || 0;
                    return (
                      <div key={prod.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.nombre}</div>
                          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtMoney(prod.precio)} · Stock {prod.stock}{prod.stock <= 5 ? " · Bajo" : ""}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => addQty(prod.id, -1)} disabled={!qty} aria-label="Quitar">−</button>
                          <span style={{ minWidth: 18, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => addQty(prod.id, 1)} disabled={qty >= prod.stock} aria-label="Agregar">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Cliente (opcional)</label>
                    <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                      <option value="">Sin cliente</option>
                      {state.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Barbero (opcional)</label>
                    <select value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
                      <option value="">Sin barbero</option>
                      {state.barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Método de pago</label>
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="nequi">Nequi</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                {sinStock && <div className="error-text show"><AlertTriangle /> Stock insuficiente para un producto.</div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "var(--surface-2)", borderRadius: 10 }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 18 }}>{fmtMoney(total)}</span>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}><X /> Cancelar</button>
            {activos.length > 0 && <button className="btn btn-success" onClick={save} disabled={!Object.keys(cart).length || sinStock}><Check /> Cobrar {fmtMoney(total)}</button>}
          </div>
        </>
      );
    };
    openModal(<Modal />);
  };

  const deleteServicio = (id: string) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    setState((s) => ({ ...s, servicios: s.servicios.filter((x) => x.id !== id) }));
    toast("Servicio eliminado", "info");
  };

  // ---------- AGENDA VIEW ----------
  const renderAgenda = () => {
    const totalSlots = (END_HOUR - START_HOUR) * (60 / SLOT_MIN);
    const isToday = agendaDate === today;
    const now = new Date();
    const nowTop = isToday ? ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / SLOT_MIN) * SLOT_H : -1;

    return (
      <div className="view">
        <div className="timeline-wrap">
          <div className="timeline-header" style={{ gridTemplateColumns: `70px repeat(${state.barberos.length}, 1fr)` }}>
            <div></div>
            {state.barberos.map((b) => (
              <div key={b.id} className="barber-head">
                <div className="avatar sm" style={{ background: b.color }}>{initials(b.nombre)}</div>
                {b.nombre.split(" ")[0]}
              </div>
            ))}
          </div>
          <div className="timeline-body" style={{ gridTemplateColumns: `70px repeat(${state.barberos.length}, 1fr)` }}>
            <div className="time-col">
              {Array.from({ length: totalSlots }).map((_, i) => {
                const min = START_HOUR * 60 + i * SLOT_MIN;
                return <div key={i} className="time-slot">{toHHMM(min)}</div>;
              })}
            </div>
            {state.barberos.map((b) => {
              const citas = state.citas.filter((c) => c.fecha === agendaDate && c.barberoId === b.id && c.estado !== "cancelada");
              // empty slot buttons
              const emptyBtns = [];
              for (let i = 0; i < totalSlots; i++) {
                const slotMin = START_HOUR * 60 + i * SLOT_MIN;
                const h = toHHMM(slotMin);
                const covered = citas.some((c) => slotMin >= toMin(c.hora) && slotMin < toMin(c.horaFin));
                if (!covered) {
                  emptyBtns.push(
                    <button key={i} className="empty-slot-btn" style={{ top: i * SLOT_H, height: SLOT_H }} onClick={() => openCitaModal(null, b.id, agendaDate, h)} />
                  );
                }
              }
              const appts = citas.map((c) => {
                const top = ((toMin(c.hora) - START_HOUR * 60) / SLOT_MIN) * SLOT_H;
                const height = ((toMin(c.horaFin) - toMin(c.hora)) / SLOT_MIN) * SLOT_H - 2;
                const cli = byId(state.clientes, c.clienteId);
                const svc = byId(state.servicios, c.servicioId);
                return (
                  <div key={c.id} className={"appointment-block " + c.estado} style={{ top, height }} onClick={() => openCitaDetail(c.id)}>
                    <div className="appt-time">{c.hora} – {c.horaFin}</div>
                    <div className="appt-name">{cli?.nombre || "—"}</div>
                    {height > 60 && <div className="appt-service">{svc?.nombre || ""}</div>}
                  </div>
                );
              });
              return (
                <div key={b.id} className="barber-col">
                  {emptyBtns}
                  {appts}
                  {isToday && nowTop >= 0 && <div className="now-line" style={{ top: nowTop }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ---------- CLIENTES VIEW ----------
  const renderClientes = () => {
    const q = searchCliente.toLowerCase();
    const list = state.clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q));
    return (
      <div className="view">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Cliente</th><th>Teléfono</th><th>Notas</th><th>Citas</th><th></th></tr>
            </thead>
            <tbody>
              {list.length ? list.map((c) => {
                const numCitas = state.citas.filter((x) => x.clienteId === c.id).length;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{initials(c.nombre)}</div>
                        <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{c.telefono}</td>
                    <td style={{ color: "var(--text-3)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notas || "—"}</td>
                    <td><span className="badge confirmada">{numCitas}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Editar" aria-label="Editar" onClick={() => openClienteModal(c.id)}><Pencil  /></button>
                        <button className="btn btn-danger btn-icon btn-sm" title="Eliminar" aria-label="Eliminar" onClick={() => deleteCliente(c.id)}><Trash2  /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5}><div className="empty"><h3>Sin clientes</h3><p>Agrega tu primer cliente</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---------- SERVICIOS VIEW ----------
  const renderServicios = () => (
    <div className="view">
      <div className="grid grid-3">
        {state.servicios.map((s) => (
          <div key={s.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{s.nombre}</div>
                <div style={{ color: "var(--text-3)", fontSize: 12 }}>{s.duracion} min</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(236,72,153,0.2))", display: "grid", placeItems: "center", color: "#c4b5fd" }}>
                <Scissors />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#c4b5fd", marginBottom: 16 }}>{fmtMoney(s.precio)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openServicioModal(s.id)}><Pencil  /> Editar</button>
              <button className="btn btn-danger btn-icon btn-sm" title="Eliminar" aria-label="Eliminar" onClick={() => deleteServicio(s.id)}><Trash2  /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- PRODUCTOS VIEW ----------
  const renderProductos = () => (
    <div className="view">
      {state.productos.filter((p) => p.stock <= 5).length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "rgba(245,158,11,0.3)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fbbf24", marginBottom: 8 }}>Stock bajo</h3>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            {state.productos.filter((p) => p.stock <= 5).map((p) => `${p.nombre} (${p.stock})`).join(" · ")}
          </div>
        </div>
      )}
      <div className="grid grid-3">
        {state.productos.map((p) => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.nombre}</div>
                <div style={{ color: "var(--text-3)", fontSize: 12 }}>{p.categoria || "General"} · Stock {p.stock}</div>
                <span className={"badge " + (p.stock <= 5 ? "pendiente" : "atendida")} style={{ marginTop: 8 }}>{p.stock <= 0 ? "Agotado" : p.stock <= 5 ? "Stock bajo" : "Disponible"}</span>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(59,130,246,0.2))", display: "grid", placeItems: "center", color: "#6ee7b7" }}>
                <Package />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#c4b5fd", marginBottom: 16 }}>{fmtMoney(p.precio)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openProductoModal(p.id)}><Pencil /> Editar</button>
              <button className="btn btn-danger btn-icon btn-sm" title="Eliminar" aria-label="Eliminar" onClick={() => deleteProducto(p.id)}><Trash2 /></button>
            </div>
          </div>
        ))}
        {state.productos.length === 0 && (
          <div className="empty" style={{ gridColumn: "1 / -1" }}><h3>Sin productos</h3><p>Crea tu primer producto para vender en tienda</p></div>
        )}
      </div>
    </div>
  );

  // ---------- VENTAS VIEW ----------
  const renderVentas = () => (
    <div className="view">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Barbero</th><th>Productos</th><th>Método</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
          <tbody>
            {state.ventas.length ? [...state.ventas].reverse().map((v) => {
              const cli = v.clienteId ? byId(state.clientes, v.clienteId) : null;
              const bar = v.barberoId ? byId(state.barberos, v.barberoId) : null;
              const itemsText = v.items.map((it) => {
                const prod = byId(state.productos, it.productoId);
                return `${prod?.nombre || "Producto"} ×${it.cantidad}`;
              }).join(", ");
              return (
                <tr key={v.id}>
                  <td style={{ color: "var(--text-3)" }}>{new Date(v.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td style={{ fontWeight: 600 }}>{cli?.nombre || "Mostrador"}</td>
                  <td style={{ color: "var(--text-2)" }}>{bar?.nombre || "—"}</td>
                  <td style={{ color: "var(--text-2)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemsText}</td>
                  <td><span className="badge confirmada">{v.metodo}</span></td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(v.total)}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={6}><div className="empty"><h3>Sin ventas</h3><p>Las ventas de productos aparecerán aquí y sumarán a caja y reportes</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---------- BARBEROS VIEW ----------
  const renderBarberos = () => (
    <div className="view">
      <div className="grid grid-3">
        {state.barberos.map((b) => {
          const citasHoy = state.citas.filter((c) => c.fecha === today && c.barberoId === b.id && c.estado !== "cancelada").length;
          const ingresosHoy = state.citas.filter((c) => c.fecha === today && c.barberoId === b.id && c.estado === "atendida").reduce((a, c) => a + (byId(state.servicios, c.servicioId)?.precio || 0), 0);
          return (
            <div key={b.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div className="avatar lg" style={{ background: b.color }}>{initials(b.nombre)}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{b.nombre}</div>
                  <div style={{ color: "var(--text-3)", fontSize: 12 }}>{b.telefono}</div>
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: 10 }}>
                <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>CITAS HOY</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{citasHoy}</div>
                </div>
                <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>INGRESOS</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(ingresosHoy)}</div>
                </div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-3)" }}>
                Horario: 09:00 – 20:00 · Lunes a Sábado
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---------- CAJA VIEW ----------
  const renderCaja = () => {
    const pagosHoy = state.pagos.filter((p) => p.fecha?.startsWith(today));
    const ventasHoy = state.ventas.filter((v) => v.fecha.startsWith(today));
    const totalEfec = pagosHoy.filter((p) => p.metodo === "efectivo").reduce((a, p) => a + p.monto, 0) + ventasHoy.filter((v) => v.metodo === "efectivo").reduce((a, v) => a + v.total, 0);
    const totalNequi = pagosHoy.filter((p) => p.metodo === "nequi").reduce((a, p) => a + p.monto, 0) + ventasHoy.filter((v) => v.metodo === "nequi").reduce((a, v) => a + v.total, 0);
    const totalTrans = pagosHoy.filter((p) => p.metodo === "transferencia").reduce((a, p) => a + p.monto, 0) + ventasHoy.filter((v) => v.metodo === "transferencia").reduce((a, v) => a + v.total, 0);
    const total = totalEfec + totalNequi + totalTrans;
    const cerrado = state.cierres.some((c) => c.fecha === today);
    const citasAtendidasSinPago = state.citas.filter((c) => c.fecha === today && c.estado === "atendida" && !state.pagos.find((p) => p.citaId === c.id));

    return (
      <div className="view">
        <div className="grid grid-4" style={{ marginBottom: 20 }}>
          <div className="card stat-card">
            <div className="stat-icon green"><Banknote /></div>
            <div className="stat-label">Efectivo</div>
            <div className="stat-value">{fmtMoney(totalEfec)}</div>
            <div className="stat-hint">Recibido</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon purple"><Smartphone /></div>
            <div className="stat-label">Nequi</div>
            <div className="stat-value">{fmtMoney(totalNequi)}</div>
            <div className="stat-hint">Recibido</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon blue"><ArrowLeftRight /></div>
            <div className="stat-label">Transferencia</div>
            <div className="stat-value">{fmtMoney(totalTrans)}</div>
            <div className="stat-hint">Recibido</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon pink"><DollarSign /></div>
            <div className="stat-label">Total del día</div>
            <div className="stat-value">{fmtMoney(total)}</div>
            <div className="stat-hint">{cerrado ? "Caja cerrada" : "Aún abierta"}</div>
          </div>
        </div>

        {citasAtendidasSinPago.length > 0 && (
          <div className="card" style={{ marginBottom: 20, borderColor: "rgba(245,158,11,0.3)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "#fbbf24" }}>
              {citasAtendidasSinPago.length} cita{citasAtendidasSinPago.length !== 1 ? "s" : ""} atendida{citasAtendidasSinPago.length !== 1 ? "s" : ""} sin cobrar
            </h3>
            {citasAtendidasSinPago.map((c) => {
              const cli = byId(state.clientes, c.clienteId);
              const svc = byId(state.servicios, c.servicioId);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cli?.nombre}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{svc?.nombre} · {c.hora}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openPagoModal(c.id)}><Check  /> Cobrar {fmtMoney(svc?.precio || 0)}</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="table-wrap">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Movimientos de hoy</h3>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{pagosHoy.length + ventasHoy.length} movimiento{(pagosHoy.length + ventasHoy.length) !== 1 ? "s" : ""} · {ventasHoy.length} venta{ventasHoy.length !== 1 ? "s" : ""} de productos</span>
          </div>
          <table>
            <thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Método</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
            <tbody>
              {pagosHoy.length + ventasHoy.length ? (
                <>
                  {pagosHoy.map((p) => {
                    const cita = byId(state.citas, p.citaId);
                    const cli = cita ? byId(state.clientes, cita.clienteId) : null;
                    const svc = cita ? byId(state.servicios, cita.servicioId) : null;
                    return (
                      <tr key={p.id}>
                        <td style={{ color: "var(--text-3)" }}>{new Date(p.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td><span className="badge confirmada">Servicio</span></td>
                        <td style={{ fontWeight: 600 }}>{cli?.nombre || "—"} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· {svc?.nombre || ""}</span></td>
                        <td><span className="badge confirmada">{p.metodo}</span></td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(p.monto)}</td>
                      </tr>
                    );
                  })}
                  {ventasHoy.map((v) => {
                    const cli = v.clienteId ? byId(state.clientes, v.clienteId) : null;
                    const items = v.items.map((it) => { const prod = byId(state.productos, it.productoId); return `${prod?.nombre || "Producto"} ×${it.cantidad}`; }).join(", ");
                    return (
                      <tr key={v.id}>
                        <td style={{ color: "var(--text-3)" }}>{new Date(v.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td><span className="badge atendida">Producto</span></td>
                        <td style={{ fontWeight: 600 }}>{cli?.nombre || "Mostrador"} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· {items}</span></td>
                        <td><span className="badge confirmada">{v.metodo}</span></td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(v.total)}</td>
                      </tr>
                    );
                  })}
                </>
              ) : (
                <tr><td colSpan={5}><div className="empty"><h3>Sin movimientos</h3><p>Servicios y productos aparecerán aquí</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---------- REPORTES VIEW ----------
  const renderReportes = () => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    const ingresosPorDia = days.map((d) => state.pagos.filter((p) => p.fecha?.startsWith(d)).reduce((a, p) => a + p.monto, 0) + state.ventas.filter((v) => v.fecha.startsWith(d)).reduce((a, v) => a + v.total, 0));
    const maxIngreso = Math.max(...ingresosPorDia, 1);
    const totalSemana = ingresosPorDia.reduce((a, b) => a + b, 0);
    const porBarbero = state.barberos.map((b) => ({
      barbero: b,
      total: state.pagos.filter((p) => {
        const c = byId(state.citas, p.citaId);
        return c?.barberoId === b.id && days.includes(c.fecha);
      }).reduce((a, p) => a + p.monto, 0) + state.ventas.filter((v) => v.barberoId === b.id && days.includes(v.fecha.split("T")[0])).reduce((a, v) => a + v.total, 0),
    })).sort((a, b) => b.total - a.total);
    const totalPagosCount = state.pagos.length + state.ventas.length;
    const totalMonto = state.pagos.reduce((a, p) => a + p.monto, 0) + state.ventas.reduce((a, v) => a + v.total, 0);
    const maxBarbero = Math.max(...porBarbero.map((x) => x.total), 1);
    const porServicio = state.servicios.map((s) => ({
      servicio: s,
      count: state.citas.filter((c) => c.servicioId === s.id && days.includes(c.fecha) && ["atendida", "confirmada"].includes(c.estado)).length,
    })).sort((a, b) => b.count - a.count);
    const maxServ = Math.max(...porServicio.map((x) => x.count), 1);
    const porProducto = state.productos.map((prod) => ({
      producto: prod,
      count: state.ventas.filter((v) => v.fecha.split("T")[0] && days.includes(v.fecha.split("T")[0])).reduce((acc, v) => {
        const it = v.items.find((i) => i.productoId === prod.id);
        return acc + (it ? it.cantidad : 0);
      }, 0),
    })).sort((a, b) => b.count - a.count);
    const maxProd = Math.max(...porProducto.map((x) => x.count), 1);

    return (
      <div className="view">
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <div className="card stat-card">
            <div className="stat-icon green"><DollarSign /></div>
            <div className="stat-label">Ingresos 7 días</div>
            <div className="stat-value">{fmtMoney(totalSemana)}</div>
            <div className="stat-hint">Semana actual</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon purple"><Calendar /></div>
            <div className="stat-label">Citas totales</div>
            <div className="stat-value">{state.citas.length}</div>
            <div className="stat-hint">Histórico</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon blue"><Clock /></div>
            <div className="stat-label">Ticket promedio</div>
            <div className="stat-value">{fmtMoney(totalPagosCount ? Math.round(totalMonto / totalPagosCount) : 0)}</div>
            <div className="stat-hint">Servicios + productos</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Ingresos últimos 7 días</h3>
          <div className="bar-chart">
            {days.map((d, i) => {
              const h = (ingresosPorDia[i] / maxIngreso) * 100;
              return (
                <div key={d} className="bar-item">
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div className="bar" style={{ height: Math.max(h, 2) + "%" }} title={fmtMoney(ingresosPorDia[i])} />
                  </div>
                  <div className="bar-label">{fmtDateShort(d)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Productos más vendidos (7 días)</h3>
            {porProducto.map((x) => (
              <div key={x.producto.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{x.producto.nombre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{x.count} u.</span>
                </div>
                <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (x.count / maxProd) * 100 + "%", background: "linear-gradient(90deg,#10b981,#3b82f6)", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
            {porProducto.length === 0 && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Sin ventas de productos</div>}
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Ingresos por barbero (7 días)</h3>
            {porBarbero.map((x) => (
              <div key={x.barbero.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{x.barbero.nombre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtMoney(x.total)}</span>
                </div>
                <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (x.total / maxBarbero) * 100 + "%", background: x.barbero.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Servicios más solicitados</h3>
            {porServicio.map((x) => (
              <div key={x.servicio.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{x.servicio.nombre}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{x.count}</span>
                </div>
                <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (x.count / maxServ) * 100 + "%", background: "linear-gradient(90deg,var(--accent),var(--accent-3))", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const topbarActions = () => {
    if (view === "dashboard") {
      return <button className="btn btn-primary" onClick={() => openCitaModal()}><Plus  /> Nueva cita</button>;
    }
    if (view === "agenda") {
      return (
        <>
          <div className="date-nav">
            <button className="btn btn-ghost btn-icon" onClick={() => shiftDate(-1)}><ChevronLeft  /></button>
            <div className="date-display" onClick={() => (document.getElementById("dateInput") as HTMLInputElement)?.showPicker?.()}>
              <CalendarDays  />
              {fmtDateLong(agendaDate)}
            </div>
            <input type="date" id="dateInput" value={agendaDate} style={{ display: "none" }} onChange={(e) => setAgendaDate(e.target.value)} />
            <button className="btn btn-ghost btn-icon" onClick={() => shiftDate(1)}><ChevronRight  /></button>
          </div>
          <button className="btn btn-primary" onClick={() => openCitaModal()}><Plus  /> Nueva cita</button>
        </>
      );
    }
    if (view === "clientes") {
      return (
        <>
          <div className="search-box">
            <Search  />
            <input type="text" value={searchCliente} onChange={(e) => setSearchCliente(e.target.value)} placeholder="Buscar por nombre o teléfono..." />
          </div>
          <button className="btn btn-primary" onClick={() => openClienteModal()}><Plus  /> Nuevo cliente</button>
        </>
      );
    }
    if (view === "servicios") {
      return <button className="btn btn-primary" onClick={() => openServicioModal()}><Plus  /> Nuevo servicio</button>;
    }
    if (view === "productos") {
      return <button className="btn btn-primary" onClick={() => openProductoModal()}><Plus /> Nuevo producto</button>;
    }
    if (view === "ventas") {
      return <button className="btn btn-success" onClick={() => openVentaModal()}><ShoppingBag /> Nueva venta</button>;
    }
    if (view === "caja") {
      const cerrado = state.cierres.some((c) => c.fecha === today);
      return cerrado ? <span className="badge atendida">Caja cerrada</span> : <button className="btn btn-success" onClick={closeCajaFn}><Check  /> Cerrar caja</button>;
    }
    return null;
  };

  const renderContent = () => {
    switch (view) {
      case "dashboard": return renderDashboard();
      case "agenda": return renderAgenda();
      case "clientes": return renderClientes();
      case "servicios": return renderServicios();
      case "productos": return renderProductos();
      case "ventas": return renderVentas();
      case "barberos": return renderBarberos();
      case "caja": return renderCaja();
      case "reportes": return renderReportes();
      default: return null;
    }
  };

  const m = VIEW_META[view];

  return (
    <div className="app">
      {renderSidebar()}
      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menú">
              <Menu />
            </button>
            <div>
              <div className="topbar-title">{m.title}</div>
              <div className="topbar-sub">{view === "agenda" ? fmtDateLong(agendaDate) : m.sub}</div>
            </div>
          </div>
          <div className="topbar-actions">{topbarActions()}</div>
        </header>
        <div className="content">
          {renderContent()}
        </div>
      </main>

      {modal && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">{modal}</div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.type}>
            {t.type === "success" && <CheckCircle2 />}
            {t.type === "error" && <XCircle />}
            {t.type === "info" && <Info />}
            <span style={{ fontWeight: 600, fontSize: 13 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}