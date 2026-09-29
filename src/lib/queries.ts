import type { Attraction, Person } from "@prisma/client";
import type { Crianca } from "./atracoes";
import { avatarVariant } from "./avatars";
import { db } from "./db";
import { hojeBrasilia, moeda } from "./format";
import { magiaOrdemDoDia } from "./magia";

export const TRIP_INICIO = "2027-01-07";
export const TRIP_FIM = "2027-01-24";

// Fallbacks pros chips da home enquanto o banco ainda não tem sync
const CHIPS_PADRAO = { viajantes: 9, diasParque: 12, casas: 3 };

const PERIODO_RANK: Record<string, number> = { manha: 0, tarde: 1, noite: 2 };

// Marco concluído: some da home e do radar de pendências
export function marcoFeito(status: string | null): boolean {
  return !!status && /feit|conclu|^ok$|resolvid/i.test(status);
}

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

  // status é texto livre (feito/concluído…), então o filtro fica em memória
  const todosMarcos = await db.milestone.findMany({ orderBy: [{ data: "asc" }, { hora: "asc" }] });
  const pendentes = todosMarcos.filter((m) => !marcoFeito(m.status));
  const comData = pendentes.filter((m) => m.data && m.data >= hoje).slice(0, 3);
  const semData = pendentes.filter((m) => !m.data).slice(0, Math.max(0, 3 - comData.length));
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

  // hospedagem_noite pode juntar duas estadias na mesma noite: "Polynesian + Drury Plaza"
  const partes = (dia.hospedagemNoite ?? "").split("+").map((p) => p.trim()).filter(Boolean);
  const estadias = (
    await Promise.all(partes.map((p) => db.accommodation.findFirst({ where: { nome: { contains: p } } })))
  ).filter((e) => e !== null);

  return {
    dia,
    agenda,
    estadias,
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

// ── Financeiro ──
// Premissa 2: visibilidade aplicada AQUI, no server. Núcleo vê só o próprio
// pacote, os próprios pagamentos e o "levar" (todos + o seu). Admin vê tudo.

export type Saldo = { moeda: string; total: number; pago: number; falta: number };

function somarPorMoeda(
  pacotes: { moeda: string | null; valorTotal: number | null }[],
  pagamentos: { moeda: string | null; valor: number | null }[],
): Saldo[] {
  const m = new Map<string, Saldo>();
  const get = (moeda: string | null) => {
    const code = moeda ?? "BRL";
    const s = m.get(code) ?? { moeda: code, total: 0, pago: 0, falta: 0 };
    m.set(code, s);
    return s;
  };
  for (const p of pacotes) get(p.moeda).total += p.valorTotal ?? 0;
  for (const p of pagamentos) get(p.moeda).pago += p.valor ?? 0;
  for (const s of m.values()) s.falta = Math.max(0, s.total - s.pago);
  return [...m.values()].sort((a, b) => a.moeda.localeCompare(b.moeda));
}

export function gastoFalta(g: { valorPrevisto: number | null; valorPago: number | null; status: string | null }) {
  if (g.status && /feit|pago|conclu|^ok$/i.test(g.status)) return 0;
  if (g.valorPrevisto == null) return null; // ainda sem valor
  return Math.max(0, g.valorPrevisto - (g.valorPago ?? 0));
}

export async function getFinanceiro(user: { nucleo: string; papel: string }) {
  const admin = user.papel === "admin";
  const whereNucleo = admin ? {} : { nucleo: user.nucleo };
  const [pacotes, pagamentos, levar, gastos] = await Promise.all([
    db.package.findMany({ where: whereNucleo, orderBy: { id: "asc" } }),
    db.payment.findMany({ where: whereNucleo, orderBy: [{ data: "desc" }, { id: "desc" }] }),
    db.budgetHint.findMany({
      where: admin ? {} : { nucleo: { in: ["todos", user.nucleo] } },
      orderBy: [{ nucleo: "asc" }, { id: "asc" }],
    }),
    admin ? db.expense.findMany({ orderBy: [{ prazo: "asc" }, { id: "asc" }] }) : Promise.resolve([]),
  ]);

  const nucleos = [...new Set(pacotes.map((p) => p.nucleo))].map((nucleo) => {
    const pc = pacotes.filter((p) => p.nucleo === nucleo);
    const pg = pagamentos.filter((p) => p.nucleo === nucleo);
    return {
      nucleo,
      pacotes: pc,
      pagamentos: pg,
      saldos: somarPorMoeda(pc, pg),
      preenchido: pc.some((p) => p.valorTotal != null),
    };
  });

  // gastos sem prazo vão pro fim (Prisma ordena null primeiro no SQLite)
  const gastosOrdenados = [...gastos].sort(
    (a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || a.id.localeCompare(b.id),
  );
  const gastosSaldo = new Map<string, { moeda: string; previsto: number; pago: number; falta: number }>();
  for (const g of gastos) {
    const code = g.moeda ?? "BRL";
    const s = gastosSaldo.get(code) ?? { moeda: code, previsto: 0, pago: 0, falta: 0 };
    s.previsto += g.valorPrevisto ?? 0;
    s.pago += g.valorPago ?? 0;
    s.falta += gastoFalta(g) ?? 0;
    gastosSaldo.set(code, s);
  }

  return {
    admin,
    nucleos,
    consolidado: admin ? somarPorMoeda(pacotes, pagamentos) : null,
    levar,
    gastos: gastosOrdenados,
    gastosSaldo: [...gastosSaldo.values()],
  };
}

// ── Pendências (só admin; a página confere o papel antes de chamar) ──

export function pendenciaFeita(status: string | null): boolean {
  return !!status && /feit|conclu|^ok$|resolvid/i.test(status);
}

export type PendenciaAuto = {
  key: string;
  origem: "Voos" | "Hospedagens" | "Marcos" | "Guia" | "Gastos";
  titulo: string;
  detalhe: string | null;
  prazo: string | null;
  href: string;
};

// Lista à mão (aba Pendencias) + radar automático do que o site já enxerga.
export async function getPendencias() {
  const hoje = hojeBrasilia();
  const [manuais, voos, estadias, marcos, guia, gastos] = await Promise.all([
    db.pendencia.findMany(),
    db.flight.findMany({ orderBy: { id: "asc" } }),
    db.accommodation.findMany({ orderBy: [{ checkin: "asc" }, { id: "asc" }] }),
    db.milestone.findMany({ where: { data: { lt: hoje } }, orderBy: { data: "asc" } }),
    db.guideEntry.findMany({ orderBy: [{ secao: "asc" }, { ordem: "asc" }] }),
    db.expense.findMany({ orderBy: { id: "asc" } }),
  ]);

  const abertas = manuais
    .filter((p) => !pendenciaFeita(p.status))
    .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || a.id.localeCompare(b.id));
  const feitas = manuais.filter((p) => pendenciaFeita(p.status)).sort((a, b) => a.id.localeCompare(b.id));

  const auto: PendenciaAuto[] = [];
  for (const v of voos) {
    if (v.status && /emitid|confirmad|feito/i.test(v.status)) continue;
    auto.push({
      key: `voo-${v.id}`,
      origem: "Voos",
      titulo: `Emitir voo · ${GRUPO_VOO_LABEL[v.grupo] ?? v.grupo}`,
      detalhe: [v.trecho, v.status ?? "sem status", v.notas].filter(Boolean).join(" · ") || null,
      prazo: v.data,
      href: "/voos",
    });
  }
  for (const e of estadias) {
    const confirmada = e.status && /confirmad|pago|feito/i.test(e.status);
    if (confirmada && e.confirmacao) continue;
    auto.push({
      key: `hosp-${e.id}`,
      origem: "Hospedagens",
      titulo: `Reservar ${e.nome}`,
      detalhe:
        [e.quem, confirmada ? "confirmada, sem nº de confirmação" : (e.status ?? "sem status")]
          .filter(Boolean)
          .join(" · ") || null,
      prazo: e.checkin,
      href: "/hospedagens",
    });
  }
  for (const m of marcos) {
    if (marcoFeito(m.status)) continue;
    auto.push({
      key: `marco-${m.id}`,
      origem: "Marcos",
      titulo: `Marco passou sem "feito": ${m.titulo}`,
      detalhe: m.descricao,
      prazo: m.data,
      href: "/",
    });
  }
  for (const g of guia) {
    if (g.conteudo) continue;
    auto.push({
      key: `guia-${g.id}`,
      origem: "Guia",
      titulo: `Preencher guia: ${g.titulo}`,
      detalhe: `seção ${g.secao}`,
      prazo: null,
      href: "/guia",
    });
  }
  for (const g of gastos) {
    const falta = gastoFalta(g);
    if (falta === 0) continue;
    auto.push({
      key: `gasto-${g.id}`,
      origem: "Gastos",
      titulo: `${falta === null ? "Orçar" : "Pagar"} ${g.item}`,
      detalhe: falta === null ? "ainda sem valor previsto" : `restam ${moeda(falta, g.moeda)}`,
      prazo: g.prazo,
      href: "/financeiro",
    });
  }

  return { abertas, feitas, auto };
}

// ── Lista de compras (interação: só SQLite, nunca vai pra planilha) ──
// Visibilidade aplicada aqui: item privado só sai do servidor pro próprio dono.

function somaPrecos(itens: { precoBrasil: number | null }[]): number {
  return itens.reduce((acc, i) => acc + (i.precoBrasil ?? 0), 0);
}

export async function getCompras(userId: string) {
  const [itens, pessoas] = await Promise.all([
    db.wishItem.findMany({
      where: { OR: [{ userId }, { publico: true }] },
      include: { user: { select: { id: true, name: true, nucleo: true } } },
      orderBy: [{ comprado: "asc" }, { createdAt: "desc" }],
    }),
    getPessoas(),
  ]);
  const nomePessoa = (id: string | null) =>
    id ? (pessoas.find((p) => p.id === id)?.nome ?? null) : null;
  const decorar = (i: (typeof itens)[number]) => ({
    id: i.id,
    nome: i.nome,
    onde: i.onde,
    paraPersonId: i.paraPersonId,
    paraNome: nomePessoa(i.paraPersonId),
    precoBrasil: i.precoBrasil,
    link: i.link,
    notas: i.notas,
    publico: i.publico,
    comprado: i.comprado,
  });
  type Item = ReturnType<typeof decorar>;

  const minha = itens.filter((i) => i.userId === userId).map(decorar);

  const porUsuario = new Map<string, { user: (typeof itens)[number]["user"]; itens: Item[] }>();
  for (const i of itens) {
    if (i.userId === userId) continue;
    const g = porUsuario.get(i.userId) ?? { user: i.user, itens: [] };
    g.itens.push(decorar(i));
    porUsuario.set(i.userId, g);
  }
  const deOutros = [...porUsuario.values()]
    .map((g) => ({ ...g, total: somaPrecos(g.itens) }))
    .sort((a, b) => a.user.name.localeCompare(b.user.name));

  return {
    minha,
    totalMinha: somaPrecos(minha),
    deOutros,
    pessoas: pessoas.map((p) => ({ id: p.id, nome: p.nome })),
  };
}

// Resumo pro card da home.
export async function getComprasResumo(userId: string) {
  const [meus, deOutros, ultimo] = await Promise.all([
    db.wishItem.count({ where: { userId } }),
    db.wishItem.count({ where: { publico: true, userId: { not: userId } } }),
    db.wishItem.findFirst({
      where: { publico: true, userId: { not: userId } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);
  return { meus, deOutros, ultimo: ultimo && { nome: ultimo.nome, por: ultimo.user.name } };
}

// ── Atrações: conteúdo da aba Atracoes + notas de cada adulto (interação, só SQLite) ──

// Parques na ordem em que aparecem no roteiro; os que não estão no roteiro vão pro fim.
function ordenarParques(codes: string[], dias: { data: string; parqueCode: string | null }[]): string[] {
  const primeiroDia = new Map<string, string>();
  for (const d of [...dias].sort((a, b) => a.data.localeCompare(b.data))) {
    if (d.parqueCode && !primeiroDia.has(d.parqueCode)) primeiroDia.set(d.parqueCode, d.data);
  }
  return [...new Set(codes)].sort(
    (a, b) => (primeiroDia.get(a) ?? "9999").localeCompare(primeiroDia.get(b) ?? "9999") || a.localeCompare(b),
  );
}

function normNome(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Os 6 logins com o avatar da pessoa correspondente na Turma (casando pelo nome).
async function getVotantes() {
  const [usuarios, pessoas] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true, nucleo: true } }),
    getPessoas(),
  ]);
  const indices = indicePorNucleo(pessoas);
  return usuarios
    .map((u) => {
      const pos = pessoas.findIndex((p) => normNome(p.nome) === normNome(u.name));
      const p = pos >= 0 ? pessoas[pos] : null;
      return {
        id: u.id,
        nome: u.name,
        iniciais: p?.iniciais ?? u.name.charAt(0).toUpperCase(),
        avatar: avatarVariant(p?.nucleo ?? u.nucleo, p ? (indices.get(p.id) ?? 0) : 0),
        pos: pos >= 0 ? pos : 99,
      };
    })
    .sort((a, b) => a.pos - b.pos || a.nome.localeCompare(b.nome));
}

type Votante = Awaited<ReturnType<typeof getVotantes>>[number];

function decorarAtracao(
  atracao: Attraction,
  notas: { userId: string; attractionId: string; nota: number }[],
  votantes: Votante[],
  userId: string,
) {
  const daAtracao = notas.filter((n) => n.attractionId === atracao.id);
  const votos = votantes.flatMap((v) => {
    const n = daAtracao.find((x) => x.userId === v.id);
    return n ? [{ ...v, nota: n.nota }] : [];
  });
  return {
    atracao,
    minhaNota: daAtracao.find((n) => n.userId === userId)?.nota ?? null,
    votos,
    media: votos.length > 0 ? votos.reduce((acc, v) => acc + v.nota, 0) / votos.length : null,
    imperdiveis: votos.filter((v) => v.nota === 3).length,
    faltam: votantes.filter((v) => !votos.some((x) => x.id === v.id)).map((v) => v.nome),
  };
}

export type AtracaoDecorada = ReturnType<typeof decorarAtracao>;

// Ranking da família: maior média primeiro; empate → mais "imperdível" → ordem da planilha.
// Sem nenhum voto vai pro fim.
export function rankingFamilia(itens: AtracaoDecorada[]): AtracaoDecorada[] {
  return [...itens].sort(
    (a, b) =>
      (b.media ?? -1) - (a.media ?? -1) ||
      b.imperdiveis - a.imperdiveis ||
      a.atracao.ordem - b.atracao.ordem,
  );
}

export async function getAtracoes(userId: string, parqueSel?: string) {
  const [atracoes, notas, votantes, dias, pessoas] = await Promise.all([
    db.attraction.findMany({ orderBy: [{ ordem: "asc" }, { id: "asc" }] }),
    db.attractionRating.findMany({ select: { userId: true, attractionId: true, nota: true } }),
    getVotantes(),
    db.day.findMany({ select: { data: true, parqueCode: true } }),
    getPessoas(),
  ]);

  const criancas: Crianca[] = pessoas
    .filter((p) => p.tipo === "crianca")
    .map((p) => ({ nome: p.nome, alturaCm: p.alturaCm }));
  const minhas = new Set(notas.filter((n) => n.userId === userId).map((n) => n.attractionId));

  const parques = ordenarParques(
    atracoes.map((a) => a.parqueCode),
    dias,
  ).map((code) => {
    const doParque = atracoes.filter((a) => a.parqueCode === code);
    return {
      code,
      total: doParque.length,
      minhas: doParque.filter((a) => minhas.has(a.id)).length,
      dias: dias
        .filter((d) => d.parqueCode === code)
        .map((d) => d.data)
        .sort(),
    };
  });
  // parque pedido; senão o primeiro com nota faltando; senão o primeiro do roteiro
  const parque =
    parques.find((p) => p.code === parqueSel) ?? parques.find((p) => p.minhas < p.total) ?? parques[0] ?? null;

  return {
    parques,
    parque,
    itens: parque
      ? atracoes.filter((a) => a.parqueCode === parque.code).map((a) => decorarAtracao(a, notas, votantes, userId))
      : [],
    criancas,
    totalVotantes: votantes.length,
    total: atracoes.length,
    minhasTotal: atracoes.filter((a) => minhas.has(a.id)).length,
  };
}

// Resumo pro card da home: quantas já têm a minha nota e onde continuar.
export async function getAtracoesResumo(userId: string) {
  const [atracoes, minhas, dias] = await Promise.all([
    db.attraction.findMany({ select: { id: true, parqueCode: true } }),
    db.attractionRating.findMany({ where: { userId }, select: { attractionId: true } }),
    db.day.findMany({ select: { data: true, parqueCode: true } }),
  ]);
  if (atracoes.length === 0) return null;
  const feitas = new Set(minhas.map((m) => m.attractionId));
  const proximo =
    ordenarParques(
      atracoes.map((a) => a.parqueCode),
      dias,
    ).find((code) => atracoes.some((a) => a.parqueCode === code && !feitas.has(a.id))) ?? null;
  return {
    total: atracoes.length,
    minhas: atracoes.filter((a) => feitas.has(a.id)).length,
    proximo,
  };
}
