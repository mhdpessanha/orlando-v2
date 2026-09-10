import { moeda } from "@/lib/format";

// Forma do item como sai de getCompras (server-safe, sem "use client").
export type Item = {
  id: string;
  nome: string;
  onde: string | null;
  paraPersonId: string | null;
  paraNome: string | null;
  precoBrasil: number | null;
  link: string | null;
  notas: string | null;
  publico: boolean;
  comprado: boolean;
};

// Linha de contexto do item: onde · pra fulano · R$ no Brasil
export function metaItem(item: Item): string {
  return [
    item.onde,
    item.paraNome ? `pra ${item.paraNome}` : null,
    item.precoBrasil != null ? `${moeda(item.precoBrasil, "BRL")} no Brasil` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
