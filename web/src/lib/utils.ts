export const STORAGE_KEY = "barberia_el_corte_v1";
export const START_HOUR = 9;
export const END_HOUR = 20;
export const SLOT_MIN = 30;
export const SLOT_H = 48;

export const uid = (p: string) => p + Math.random().toString(36).slice(2, 8);

export const fmtMoney = (n: number) => "$" + Number(n).toLocaleString("es-CO");

export const fmtDateLong = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
};

export const fmtDateShort = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function byId<T extends { id: string }>(arr: T[], id: string | null | undefined) {
  return arr.find((x) => x.id === id);
}

export const todayStr = () => new Date().toISOString().split("T")[0];

export function hasOverlap(
  citas: { id: string; barberoId: string; fecha: string; hora: string; horaFin: string; estado: string }[],
  barberoId: string,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  excludeId: string | null = null
) {
  const start = toMin(horaInicio);
  const end = toMin(horaFin);
  return citas.some((c) => {
    if (c.id === excludeId) return false;
    if (c.barberoId !== barberoId) return false;
    if (c.fecha !== fecha) return false;
    if (["cancelada", "no_show"].includes(c.estado)) return false;
    const s = toMin(c.hora);
    const e = toMin(c.horaFin);
    return start < e && end > s;
  });
}