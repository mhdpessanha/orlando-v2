import type { Person } from "@prisma/client";
import { db } from "./db";
import { hojeBrasilia } from "./format";
import { magiaOrdemDoDia } from "./magia";

export const TRIP_INICIO = "2027-01-07";
export const TRIP_FIM = "2027-01-24";

// Fallbacks pros chips da home enquanto o banco ainda não tem sync
const CHIPS_PADRAO = { viajantes: 9, diasParque: 12, casas: 3 };

const PERIODO_RANK: Record<string, number> = { manha: 0, tarde: 1, noite: 2 };

export async function getHomeData() {
  const hoje = hojeBrasilia();
  const [pessoas, diasParque, estadias, totalFatos, dias] = await Promise.all([
    db.person.count(),
    db.day.count({ where: { parqueCode: { not: null } } }),
    db.accommodation.findMany({ select: { nome: true } }),
    db.magicFact.count(),
    db.day.findMany({ orderBy: { data: "asc" } }),
  ]);

  const magia =
    totalFatos > 0
      ? await db.magicFact.findFirst({ where: { ordem: magiaOrdemDoDia(totalFatos) } })
      : null;

  const comData = await db.milestone.findMany({
    where: { data: { gte: hoje } },
    orderBy: [{ data: "asc" }, { hora: "asc" }],
    take: 3,
  });
  const semData =
    comData.length < 3
      ? await db.milestone.findMany({ where: { data: null }, take: 3 - comData.length })
      : [];
  const marcos = [...comData, ...semData];

  const futuros = dias.filter((d) => d.data >= hoje);
  const proximosDias = (futuros.length > 0 ? futuros : dias).slice(0, 3);

  return {
    chips: {
      viajantes: pessoas || CHIPS_PADRAO.viajantes,
      diasParque: diasParque || CHIPS_PADRAO.diasParque,
      casas: new Set(estadias.map((e) => e.nome)).size || CHIPS_PADRAO.casas,
    },
    magia: magia && { ...magia, total: totalFatos },
    marcos,
    proximosDias,
    totalDias: dias.length,
  };
}

export function getDias() {
  return db.day.findMany({ orderBy: { data: "asc" } });
}

export async function getDiaDetalhe(id: string) {
  const dia = await db.day.findUnique({ where: { id } });
  if (!dia) return null;

  const [agenda, todosDias, pessoas] = await Promise.all([
    db.agendaItem.findMany({ where: { roteiroId: id } }),
    db.day.findMany({ orderBy: { data: "asc" }, select: { id: true } }),
    getPessoas(),
  ]);
  agenda.sort(
    (a, b) => (PERIODO_RANK[a.periodo] ?? 9) - (PERIODO_RANK[b.periodo] ?? 9) || a.ordem - b.ordem,
  );

  const estadia = dia.hospedagemNoite
    ? await db.accommodation.findFirst({
        where: { nome: { contains: dia.hospedagemNoite } },
      })
    : null;

  return {
    dia,
    agenda,
    estadia,
    numeroDoDia: todosDias.findIndex((d) => d.id === id) + 1,
    totalDias: todosDias.length,
    pessoas,
  };
}

// "quem" é texto livre da planilha. "todos"/vazio = turma inteira; senão,
// tenta casar nomes/iniciais contidos no texto.
export function pessoasDoDia(quem: string | null, pessoas: Person[]): Person[] {
  if (!quem || /todo/i.test(quem)) return pessoas;
  const alvo = quem.toLowerCase();
  return pessoas.filter((p) => alvo.includes(p.nome.toLowerCase()));
}

// Ordem estável da planilha (ids p01, p02…) + índice dentro do núcleo pro avatar.
export async function getPessoas() {
  return db.person.findMany({ orderBy: { id: "asc" } });
}

export function indicePorNucleo(pessoas: Person[]): Map<string, number> {
  const contadores: Record<string, number> = {};
  const indices = new Map<string, number>();
  for (const p of pessoas) {
    indices.set(p.id, contadores[p.nucleo] ?? 0);
    contadores[p.nucleo] = (contadores[p.nucleo] ?? 0) + 1;
  }
  return indices;
}

export const GRUPO_VOO_LABEL: Record<string, string> = {
  familia: "Família",
  gabi: "Família da Gabi",
  vm: "Vitor & Mariana",
};

export async function getVoosPorGrupo() {
  const voos = await db.flight.findMany({ orderBy: [{ data: "asc" }, { id: "asc" }] });
  return ["familia", "gabi", "vm"]
    .map((grupo) => ({ grupo, voos: voos.filter((v) => v.grupo === grupo) }))
    .filter((g) => g.voos.length > 0);
}

export function getEstadias() {
  return db.accommodation.findMany({ orderBy: [{ checkin: "asc" }, { id: "asc" }] });
}

export async function getGuia() {
  const entries = await db.guideEntry.findMany({ orderBy: [{ ordem: "asc" }, { id: "asc" }] });
  const secoes = new Map<string, typeof entries>();
  for (const e of entries) {
    const lista = secoes.get(e.secao) ?? [];
    lista.push(e);
    secoes.set(e.secao, lista);
  }
  return [...secoes.entries()].map(([secao, itens]) => ({ secao, itens }));
}

export function parseOpcoes(opcoes: string): string[] {
  return opcoes.split("|").map((s) => s.trim()).filter(Boolean);
}

export function pollAberta(poll: { status: string | null; encerraEm: string | null }): boolean {
  if (poll.status && /fechad/i.test(poll.status)) return false;
  if (poll.encerraEm && poll.encerraEm < hojeBrasilia()) return false;
  return true;
}

// Decisões com resultado: quem votou em quê, meu voto, quem falta.
// Votos em opções que saíram da planilha são ignorados (a pessoa revota).
export async function getDecisoes(userId: string) {
  const [polls, votos, usuarios] = await Promise.all([
    db.poll.findMany({ orderBy: { ordem: "asc" } }),
    db.vote.findMany({ include: { user: { select: { id: true, name: true } } } }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);
  return polls.map((poll) => {
    const opcoes = parseOpcoes(poll.opcoes);
    const doPoll = votos.filter((v) => v.pollId === poll.id && opcoes.includes(v.choice));
    const meuVoto = doPoll.find((v) => v.userId === userId)?.choice ?? null;
    return {
      poll,
      opcoes,
      aberta: pollAberta(poll),
      meuVoto,
      totalVotos: doPoll.length,
      porOpcao: opcoes.map((opcao) => ({
        opcao,
        votantes: doPoll.filter((v) => v.choice === opcao).map((v) => v.user.name),
      })),
      faltam: usuarios.filter((u) => !doPoll.some((v) => v.userId === u.id)).map((u) => u.name),
    };
  });
}

// Resumo pro card da home: quantas abertas e quantas ainda sem o meu voto.
export async function getDecisoesResumo(userId: string) {
  const polls = await db.poll.findMany();
  const abertas = polls.filter(pollAberta);
  if (polls.length === 0) return null;
  const meus = await db.vote.findMany({ where: { userId } });
  const pendentes = abertas.filter((p) => {
    const v = meus.find((m) => m.pollId === p.id);
    return !v || !parseOpcoes(p.opcoes).includes(v.choice);
  }).length;
  return { abertas: abertas.length, pendentes };
}

// Premissa 2: visibilidade financeira aplicada AQUI, no server.
// A tela mostra só o agregado do núcleo (total/pago/restante), por moeda —
// os itens individuais ficam na planilha do Murilo.
export async function getFinanceiroResumo(user: { nucleo: string; papel: string }) {
  const where = user.papel === "admin" ? {} : { nucleo: user.nucleo };
  const itens = await db.financeItem.findMany({ where, orderBy: { id: "asc" } });

  type Agregado = { total: number; pago: number; restante: number; preenchido: boolean };
  const porNucleo = new Map<string, Map<string, Agregado>>();
  for (const i of itens) {
    const moedas = porNucleo.get(i.nucleo) ?? new Map<string, Agregado>();
    const code = i.moeda ?? "BRL";
    const t = moedas.get(code) ?? { total: 0, pago: 0, restante: 0, preenchido: false };
    t.total += i.valorTotal ?? 0;
    t.pago += i.valorPago ?? 0;
    t.restante +=
      i.valorRestante ??
      (i.valorTotal != null && i.valorPago != null ? i.valorTotal - i.valorPago : 0);
    // enquanto a planilha só tem os itens (sem números), a tela mostra "em preenchimento"
    t.preenchido ||= i.valorTotal != null || i.valorPago != null || i.valorRestante != null;
    moedas.set(code, t);
    porNucleo.set(i.nucleo, moedas);
  }

  return [...porNucleo.entries()].map(([nucleo, moedas]) => ({
    nucleo,
    moedas: [...moedas.entries()].map(([moeda, v]) => ({ moeda, ...v })),
  }));
}
