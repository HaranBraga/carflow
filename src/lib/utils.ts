import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export function formatPlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  POPULAR: "Carro Popular",
  SUV_MEDIO: "SUV Médio",
  SUV_GRANDE: "SUV Grande",
  CAMIONETE: "Camionete",
  VAN_CAMINHAO: "Van / Caminhão",
  MOTO: "Moto",
  TAPETE_RESIDENCIAL: "Tapete Residencial",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  OTHER: "Outro",
  NOT_INFORMED: "Não informado",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  IN_PROGRESS: "Em lavagem",
  FINISHED: "Finalizado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  FINISHED: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const CHECKLIST_AREAS = [
  "Para-choque dianteiro",
  "Para-choque traseiro",
  "Lateral esquerda",
  "Lateral direita",
  "Teto",
  "Capô",
  "Porta-malas",
  "Rodas",
  "Vidro dianteiro",
  "Vidro traseiro",
  "Espelhos",
  "Interior",
];
