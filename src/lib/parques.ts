export type ParqueInfo = { nome: string; cor: string };

export const PARQUE_INFO: Record<string, ParqueInfo> = {
  MK: { nome: "Magic Kingdom", cor: "#8f7bff" },
  EP: { nome: "EPCOT", cor: "#57c7d8" },
  AK: { nome: "Animal Kingdom", cor: "#5fbf7a" },
  HS: { nome: "Hollywood Studios", cor: "#ff8f66" },
  USF: { nome: "Universal Studios", cor: "#f2b344" },
  IOA: { nome: "Islands of Adventure", cor: "#e06a8a" },
  EPIC: { nome: "Epic Universe", cor: "#6f8dff" },
  SW: { nome: "SeaWorld", cor: "#4fa3e0" },
  PEPPA: { nome: "Peppa Pig Park", cor: "#f08bb6" },
};

export function hexRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const PERIODO_INFO: Record<string, { label: string; cor: string }> = {
  manha: { label: "MANHÃ", cor: "#57c7d8" },
  tarde: { label: "TARDE", cor: "#f6c453" },
  noite: { label: "NOITE", cor: "#8f7bff" },
};
