import type { KidsPlanItem, Person } from "@prisma/client";

// Plano das crianças: organiza as linhas de um dia (aba PlanoCriancas) em blocos,
// itens fixos, grupos de alternativas (planos A/B/C) e a reserva do dia (plano D).
// Lógica pura — serve pro server e pros testes.

export const TIPO_INFO: Record<string, { label: string; cor: string }> = {
  todos: { label: "Todos juntos", cor: "#f6c453" },
  adultos: { label: "Adultos", cor: "#b7a9e8" },
  criancas: { label: "Crianças", cor: "#5fd0c5" },
};

export function tipoInfo(tipo: string) {
  return TIPO_INFO[tipo] ?? TIPO_INFO.todos;
}

export type Opcao = { letra: string; itens: KidsPlanItem[] };
export type Entrada =
  | { tipo: "item"; item: KidsPlanItem }
  | { tipo: "alternativas"; id: string; opcoes: Opcao[] };
export type Bloco = { chave: string; nome: string | null; inicio: string | null; fim: string | null; entradas: Entrada[] };
export type PlanoDoDia = { blocos: Bloco[]; reserva: KidsPlanItem[]; total: number };

// "9:05" → 545 (minutos do dia); vazio → null
export function minutos(hora: string | null): number | null {
  const m = hora?.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// "09:05" → "9h05"; "10:00" → "10h"
export function horaCurta(hora: string): string {
  const m = hora.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hora;
  return `${Number(m[1])}h${m[2] === "00" ? "" : m[2]}`;
}

export function faixaHoras(inicio: string | null, fim: string | null): string | null {
  if (!inicio) return null;
  return fim ? `${horaCurta(inicio)} – ${horaCurta(fim)}` : `a partir das ${horaCurta(inicio)}`;
}

// Dois itens disputam o mesmo horário? (sem fim = vai até o fim do dia; encostar não conta)
function sobrepoe(a: KidsPlanItem, b: KidsPlanItem): boolean {
  const ai = minutos(a.horaInicio);
  const bi = minutos(b.horaInicio);
  if (ai === null || bi === null) return false;
  const af = minutos(a.horaFim) ?? 24 * 60;
  const bf = minutos(b.horaFim) ?? 24 * 60;
  return ai < bf && bi < af;
}

const ehAlternativa = (i: KidsPlanItem) => i.plano === "A" || i.plano === "B" || i.plano === "C";

// Alternativas de verdade = mesmo bloco, mesmo tipo e horários que se sobrepõem.
// Letra sem par (um "B" sozinho) vira item normal, com o selo do plano.
function entradasDoBloco(itens: KidsPlanItem[]): Entrada[] {
  const grupoDe = new Map<string, KidsPlanItem[]>();
  for (const item of itens.filter(ehAlternativa)) {
    const ligados = new Set<KidsPlanItem[]>();
    for (const [, grupo] of grupoDe) {
      if (grupo[0].tipo === item.tipo && grupo.some((g) => sobrepoe(g, item))) ligados.add(grupo);
    }
    const novo = [...[...ligados].flat(), item];
    for (const i of novo) grupoDe.set(i.id, novo);
  }

  const entradas: Entrada[] = [];
  const feitos = new Set<KidsPlanItem[]>();
  for (const item of itens) {
    const grupo = grupoDe.get(item.id);
    const letras = new Set(grupo?.map((g) => g.plano));
    if (!grupo || letras.size < 2) {
      entradas.push({ tipo: "item", item });
      continue;
    }
    if (feitos.has(grupo)) continue;
    feitos.add(grupo);
    const opcoes = [...letras]
      .sort()
      .map((letra) => ({ letra: letra!, itens: grupo.filter((g) => g.plano === letra) }));
    entradas.push({ tipo: "alternativas", id: grupo[0].id, opcoes });
  }
  return entradas;
}

export function montarPlano(linhas: KidsPlanItem[]): PlanoDoDia {
  const itens = [...linhas].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
  const reserva = itens.filter((i) => i.plano === "D");
  const doDia = itens.filter((i) => i.plano !== "D");

  // Bloco = trecho seguido com o mesmo nome (o nome pode voltar mais tarde no dia)
  const trechos: KidsPlanItem[][] = [];
  for (const item of doDia) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo[0].bloco === item.bloco) ultimo.push(item);
    else trechos.push([item]);
  }

  const blocos = trechos.map((trecho) => {
    const inicios = trecho.map((i) => i.horaInicio).filter((h): h is string => !!h);
    const fins = trecho.map((i) => i.horaFim).filter((h): h is string => !!h);
    const menor = (hs: string[]) => hs.reduce((a, b) => (minutos(a)! <= minutos(b)! ? a : b));
    const maior = (hs: string[]) => hs.reduce((a, b) => (minutos(a)! >= minutos(b)! ? a : b));
    return {
      chave: trecho[0].id,
      nome: trecho[0].bloco,
      inicio: inicios.length > 0 ? menor(inicios) : null,
      // item sem hora de fim deixa o bloco em aberto
      fim: fins.length === trecho.length && fins.length > 0 ? maior(fins) : null,
      entradas: entradasDoBloco(trecho),
    };
  });

  return { blocos, reserva, total: itens.length };
}

export function idsAtracoes(item: { atracaoIds: string | null }): string[] {
  return (item.atracaoIds ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

// "a confirmar" etc.: qualquer status que não seja "fechado" ganha selo
export function statusAberto(status: string | null): string | null {
  if (!status) return null;
  return /^fechad[oa]$/i.test(status.trim()) ? null : status.trim();
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Rostos de quem o texto cita. É enfeite: o texto da planilha continua sendo a
// informação. O que está entre parênteses é ressalva ("Vitor e Mariana num quick
// service"), então não conta; "todos menos…" não ganha rosto nenhum.
export function pessoasCitadas(quem: string | null, pessoas: Person[]): Person[] {
  if (!quem) return [];
  const texto = semAcento(quem.replace(/\([^)]*\)/g, " "));
  if (/\bmenos\b/.test(texto)) return [];
  if (/\bos 9\b/.test(texto)) return pessoas;
  const citadas = new Set<string>();
  if (/\bfm\b/.test(texto)) pessoas.filter((p) => p.nucleo === "pessanha").forEach((p) => citadas.add(p.id));
  if (/\bfg\b/.test(texto)) pessoas.filter((p) => p.nucleo === "gabi").forEach((p) => citadas.add(p.id));
  if (/\bcriancas\b/.test(texto)) pessoas.filter((p) => p.tipo === "crianca").forEach((p) => citadas.add(p.id));
  for (const p of pessoas) {
    const nome = semAcento(p.nome.trim().split(/\s+/)[0]);
    if (new RegExp(`\\b${nome}\\b`).test(texto)) citadas.add(p.id);
  }
  return pessoas.filter((p) => citadas.has(p.id));
}
