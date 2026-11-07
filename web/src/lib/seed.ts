import type { AppState } from "./types";
import { uid } from "./utils";

export function createSeed(): AppState {
  const SEED: AppState = {
    currentUser: { id: "u1", nombre: "Dueño", rol: "admin", avatar: "D" },
    barberos: [
      { id: "b1", nombre: "Carlos Ruiz", color: "#8b5cf6", telefono: "300 111 2233", activo: true },
      { id: "b2", nombre: "Andrés Peña", color: "#06b6d4", telefono: "301 444 5566", activo: true },
      { id: "b3", nombre: "Diego Mora", color: "#ec4899", telefono: "302 777 8899", activo: true },
    ],
    servicios: [
      { id: "s1", nombre: "Corte clásico", precio: 25000, duracion: 30, activo: true },
      { id: "s2", nombre: "Corte + barba", precio: 35000, duracion: 50, activo: true },
      { id: "s3", nombre: "Perfilado de barba", precio: 15000, duracion: 20, activo: true },
      { id: "s4", nombre: "Diseño de cejas", precio: 10000, duracion: 15, activo: true },
      { id: "s5", nombre: "Corte niños", precio: 20000, duracion: 25, activo: true },
    ],
    productos: [
      { id: "p1", nombre: "Pomada mate", precio: 22000, stock: 14, activo: true, categoria: "Peinado" },
      { id: "p2", nombre: "Cera de barba", precio: 18000, stock: 8, activo: true, categoria: "Barba" },
      { id: "p3", nombre: "Shampoo de menta", precio: 16000, stock: 20, activo: true, categoria: "Lavado" },
      { id: "p4", nombre: "Aceite de barba", precio: 28000, stock: 5, activo: true, categoria: "Barba" },
      { id: "p5", nombre: "Gel fijador", precio: 12000, stock: 3, activo: true, categoria: "Peinado" },
    ],
    ventas: [],
    clientes: [
      { id: "c1", nombre: "Juan Pérez", telefono: "310 555 1234", notas: "Prefiere degradado bajo" },
      { id: "c2", nombre: "Mateo Gómez", telefono: "320 444 5566", notas: "" },
      { id: "c3", nombre: "Sofía Ramírez", telefono: "315 333 7788", notas: "Corte femenino" },
      { id: "c4", nombre: "Andrés López", telefono: "312 666 9900", notas: "" },
      { id: "c5", nombre: "Camilo Torres", telefono: "318 111 2233", notas: "Alérgico a loción con alcohol" },
    ],
    citas: [],
    pagos: [],
    cierres: [],
  };

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const base = [
    { clienteId: "c1", barberoId: "b1", servicioId: "s1", fecha: today, hora: "09:30", estado: "confirmada" },
    { clienteId: "c2", barberoId: "b2", servicioId: "s2", fecha: today, hora: "10:00", estado: "pendiente" },
    { clienteId: "c3", barberoId: "b3", servicioId: "s4", fecha: today, hora: "11:00", estado: "confirmada" },
    { clienteId: "c4", barberoId: "b1", servicioId: "s2", fecha: today, hora: "14:00", estado: "pendiente" },
    { clienteId: "c5", barberoId: "b2", servicioId: "s3", fecha: today, hora: "15:30", estado: "confirmada" },
    { clienteId: "c1", barberoId: "b3", servicioId: "s1", fecha: tomorrow, hora: "10:00", estado: "pendiente" },
  ];
  base.forEach((b, i) => {
    const svc = SEED.servicios.find((s) => s.id === b.servicioId)!;
    const [h, m] = b.hora.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + svc.duracion;
    const hFin = String(Math.floor(endMin / 60)).padStart(2, "0");
    const mFin = String(endMin % 60).padStart(2, "0");
    SEED.citas.push({
      id: "ap" + (i + 1),
      ...b,
      horaFin: `${hFin}:${mFin}`,
    });
  });

  void uid;
  return SEED;
}