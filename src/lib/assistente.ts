// Assistente da viagem: monta o que o modelo lê antes de responder.
// Três blocos, nessa ordem (a ordem importa pro cache de prompt):
//  1. INSTRUCOES — fixo
//  2. contextoViagem() — o que todo logado já vê no site; muda só no sync
//     ou quando alguém vota/dá nota, então é igual pra todo mundo e fica em cache
//  3. contextoUsuario() — quem pergunta, a data de hoje, financeiro e compras.
// Premissa 2: o bloco 3 sai das MESMAS queries filtradas das telas
// (getFinanceiro, getCompras). O que o usuário não pode ver nem entra no prompt.

import type { User } from "@prisma/client";
import { alturaM, criancasNaAltura, NOTAS, parseAlertas, tipoLabel } from "./atracoes";
import { db } from "./db";
import { diasAte, hojeBrasilia, moeda, tituloDia } from "./format";
import { PARQUE_INFO, PERIODO_INFO } from "./parques";
import {
  gastoFalta,
  getAtracoesComNotas,
  getCompras,
  getDecisoes,
  getDias,
  getEstadias,
  getFinanceiro,
  getGuia,
  getPendencias,
  getPessoas,
  getVoosPorGrupo,
  GRUPO_DO_NUCLEO,
  GRUPO_VOO_LABEL,
  marcoFeito,
  TRIP_INICIO,
} from "./queries";

export const INSTRUCOES = `Você é o assistente do site da viagem da família a Orlando (7 a 24 de janeiro de 2027, 9 pessoas: 6 adultos e 3 crianças). Quem fala com você é um dos adultos, logado no site. Tudo o que você sabe do plano está nos dados abaixo, que vêm da planilha onde o Murilo organiza a viagem.

Como responder:
- Português do Brasil, tom leve e animado, mas direto ao ponto: a pessoa está no celular, às vezes com pressa (no aeroporto, na fila do parque). Responda primeiro exatamente o que foi perguntado, em poucas frases; só detalhe se pedirem.
- Sobre o plano da família, use só os dados abaixo. Se algo não estiver lá ou estiver em branco, diga que isso ainda não está no site e sugira perguntar pro Murilo. Nunca invente horário, valor, localizador, endereço ou quem vai aonde.
- Conhecimento geral sobre Orlando e os parques (como funciona Lightning Lane, o que é Rider Switch, dicas de fila) pode usar, deixando claro que é dica geral e não parte do plano.
- Texto simples, sem markdown: nada de asteriscos, #, tabelas ou links em markdown. Para listas, use linhas começando com "• ".
- Datas por extenso ("sábado, 9 de janeiro"), horas como 21h05, valores como R$ 1.234,56 ou US$ 100,00.
- Localizadores, números de voo e códigos de confirmação: copie exatamente como estão nos dados.
- "Eu", "meu", "minha", "a gente" se referem a quem está perguntando (identificado no último bloco). "Hoje" e "amanhã" contam a partir da data informada lá.
- Financeiro: você só recebeu o financeiro do núcleo de quem pergunta (o Murilo, admin, recebe todos). Se perguntarem do dinheiro de outro núcleo, explique que cada núcleo só vê o próprio financeiro no site.
- Você só lê: não consegue mudar nada no site nem na planilha. Para votar, dar nota em atração ou mexer na lista de compras, indique a tela: Decisões, Roteiro › Atrações, Compras. Outras telas: Início, Roteiro (um dia por tela), Voos e Hospedagens (atalhos no Guia), Guia, Financeiro, Turma (no rodapé).`;

type Valor = string | number | null | undefined;

// "rótulo: valor" só do que está preenchido, separado por " · " (uma linha por item)
function campos(pares: [string, Valor][]): string {
  return pares
    .map(([k, v]) => [k, typeof v === "string" ? texto(v) : v] as const)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

// "• título — campos", sem o travessão quando não há campo preenchido
function item(titulo: string, pares: [string, Valor][]): string {
  const c = campos(pares);
  return `• ${titulo}${c ? ` — ${c}` : ""}`;
}

function data(d: string | null): string | null {
  return d ? `${d} (${tituloDia(d)})` : null;
}

function texto(t: string | null): string | null {
  return t?.trim() ? t.trim().replace(/\s*\n+\s*/g, " / ") : null;
}

function parque(code: string | null): string {
  if (!code) return "sem parque";
  return `${PARQUE_INFO[code]?.nome ?? code} (${code})`;
}

async function secaoRoteiro(): Promise<string> {
  const [dias, agenda] = await Promise.all([
    getDias(),
    db.agendaItem.findMany({ orderBy: [{ roteiroId: "asc" }, { ordem: "asc" }, { id: "asc" }] }),
  ]);
  const periodos = Object.keys(PERIODO_INFO);
  const linhas = [`## Roteiro (${dias.length} dias)`];
  dias.forEach((d, i) => {
    linhas.push(`### ${data(d.data)} · dia ${i + 1} de ${dias.length} · ${d.titulo}`);
    linhas.push(
      campos([
        ["parque", parque(d.parqueCode)],
        ["quem", d.quem || "todos"],
        ["hospedagem da noite", d.hospedagemNoite],
        ["early entry", d.earlyEntry],
        ["destaque", d.destaque],
        ["notas", d.notas],
      ]),
    );
    const doDia = agenda
      .filter((a) => a.roteiroId === d.id)
      .sort((a, b) => periodos.indexOf(a.periodo) - periodos.indexOf(b.periodo) || a.ordem - b.ordem);
    for (const a of doDia) {
      const extra = campos([
        ["local", a.local],
        ["detalhe", a.detalhe],
        ["chip", a.chip],
      ]);
      linhas.push(`• ${PERIODO_INFO[a.periodo]?.label.toLowerCase() ?? a.periodo}: ${a.titulo}${extra ? ` — ${extra}` : ""}`);
    }
  });
  return linhas.join("\n");
}

async function secaoVoos(): Promise<string> {
  const grupos = await getVoosPorGrupo();
  const nucleosDoGrupo = (g: string) =>
    Object.entries(GRUPO_DO_NUCLEO)
      .filter(([, grupo]) => grupo === g)
      .map(([n]) => n)
      .join(" e ");
  const linhas = ["## Voos (reserva = localizador)"];
  for (const { grupo, voos } of grupos) {
    linhas.push(`### ${GRUPO_VOO_LABEL[grupo] ?? grupo} (grupo ${grupo}: núcleo ${nucleosDoGrupo(grupo)})`);
    for (const v of voos) {
      linhas.push(
        `• ${campos([
          ["trecho", v.trecho],
          ["data", data(v.data)],
          ["voo", v.voo],
          ["rota", [v.origem, v.destino].filter(Boolean).join(" → ")],
          ["saída", v.saida],
          ["chegada", v.chegada],
          ["localizador", v.reserva],
          ["status", v.status],
          ["bilhete", v.bilhete],
          ["bagagem", v.bagagem],
          ["assentos", v.assentos],
          ["notas", v.notas],
          ["detalhes", v.detalhes],
        ])}`,
      );
    }
  }
  return linhas.join("\n");
}

async function secaoHospedagens(): Promise<string> {
  const estadias = await getEstadias();
  return [
    "## Hospedagens",
    ...estadias.map(
      (e) =>
        item(e.nome, [
          ["tipo", e.tipo],
          ["check-in", data(e.checkin)],
          ["check-out", data(e.checkout)],
          ["quem", e.quem],
          ["status", e.status],
          ["confirmação", e.confirmacao],
          ["endereço", e.endereco],
          ["notas", e.notas],
          ["detalhes", e.detalhes],
        ]),
    ),
  ].join("\n");
}

async function secaoTurma(): Promise<string> {
  const pessoas = await getPessoas();
  return [
    "## Turma (núcleos: pessanha = Murilo e Joana; gabi = Gabi, Gustavo e Lucas; vitor; mariana)",
    ...pessoas.map(
      (p) =>
        item(p.nome, [
          ["núcleo", p.nucleo],
          ["tipo", p.tipo === "crianca" ? "criança" : p.tipo],
          ["aniversário", p.aniversario],
          ["altura", p.alturaCm ? `${p.alturaCm} cm` : null],
          ["sobre", p.tagline],
        ]),
    ),
  ].join("\n");
}

// Pendentes vão inteiros (são os que a home mostra). Dos feitos vai só o título:
// a descrição deles às vezes traz quanto o Murilo pagou, e isso é Gastos (só admin).
async function secaoMarcos(): Promise<string> {
  const marcos = await db.milestone.findMany({ orderBy: [{ data: "asc" }, { hora: "asc" }, { id: "asc" }] });
  const feitos = marcos.filter((m) => marcoFeito(m.status));
  return [
    "## Marcos pendentes (prazos e datas importantes antes e durante a viagem)",
    ...marcos
      .filter((m) => !marcoFeito(m.status))
      .map((m) =>
        item(m.titulo, [
          ["data", data(m.data) ?? "a definir"],
          ["hora", m.hora],
          ["categoria", m.categoria],
          ["status", m.status],
          ["descrição", m.descricao],
        ]),
      ),
    ...(feitos.length ? ["### Marcos já feitos", ...feitos.map((m) => `• ${m.titulo}`)] : []),
  ].join("\n");
}

async function secaoGuia(): Promise<string> {
  const secoes = await getGuia();
  const linhas = ["## Guia da viagem"];
  for (const { secao, itens } of secoes) {
    linhas.push(`### ${secao}`);
    for (const g of itens) {
      linhas.push(`• ${g.titulo}: ${[texto(g.conteudo) ?? "(ainda sem conteúdo)", texto(g.detalhes)].filter(Boolean).join(" / ")}`);
    }
  }
  return linhas.join("\n");
}

async function secaoDecisoes(): Promise<string> {
  // userId vazio: só a parte pública (votos de todo mundo); "meu voto" sai do resultado
  const decisoes = await getDecisoes("");
  if (decisoes.length === 0) return "";
  const linhas = ["## Decisões (votações da família)"];
  for (const d of decisoes) {
    linhas.push(
      `### ${d.poll.pergunta} — ${d.aberta ? `aberta${d.poll.encerraEm ? `, vota até ${data(d.poll.encerraEm)}` : ""}` : "encerrada"}`,
    );
    const contexto = [texto(d.poll.detalhe), texto(d.poll.explicacao)].filter(Boolean).join(" / ");
    if (contexto) linhas.push(contexto);
    for (const o of d.porOpcao) {
      const nomes = [...o.votantes].sort();
      linhas.push(`• ${o.opcao}: ${nomes.length} voto(s)${nomes.length ? ` (${nomes.join(", ")})` : ""}`);
    }
    if (d.faltam.length > 0) linhas.push(`ainda não votaram: ${[...d.faltam].sort().join(", ")}`);
  }
  return linhas.join("\n");
}

async function secaoAtracoes(): Promise<string> {
  const { adultos, infantis, criancas } = await getAtracoesComNotas();
  if (adultos.length === 0 && infantis.length === 0) return "";
  const notasTexto = (votos: { nome: string; nota: number }[]) =>
    NOTAS.map((n) => {
      const quem = votos.filter((v) => v.nota === n.valor).map((v) => v.nome);
      return quem.length ? `${n.label}: ${quem.join(", ")}` : null;
    })
      .filter(Boolean)
      .join("; ");
  const alturaTexto = (alturaMinCm: number | null) => {
    if (alturaMinCm === null) return "sem altura mínima";
    const alt = criancasNaAltura(alturaMinCm, criancas);
    return `altura mínima ${alturaM(alturaMinCm)}${alt.podem.length ? ` (alcançam: ${alt.podem.map((c) => c.nome).join(", ")})` : ""}${
      alt.naoPodem.length ? ` (não alcançam: ${alt.naoPodem.map((c) => c.nome).join(", ")})` : ""
    }`;
  };
  const linhas = [
    "## Atrações (tier list; notas: 3 Imperdível, 2 Quero muito, 1 Se der, 0 Passo. Em cada parque, primeiro a lista dos adultos, do topo do ranking deles pra baixo — a média é só dos adultos. As notas das crianças foram dadas pelos pais, vendo o vídeo com elas, e vêm à parte. Depois vêm os brinquedos que estão só na lista das crianças, do topo do ranking delas.)",
  ];
  const parques = [...new Set([...adultos, ...infantis].map((r) => r.atracao.parqueCode))];
  for (const code of parques) {
    linhas.push(`### ${parque(code)}`);
    for (const r of adultos.filter((x) => x.atracao.parqueCode === code)) {
      const a = r.atracao;
      linhas.push(
        item(a.nome, [
          ["tipo", tipoLabel(a.tipo)],
          ["área", a.area],
          ["altura", alturaTexto(a.alturaMinCm)],
          ["alertas", parseAlertas(a.alertas).join(", ")],
          ["fila rápida", a.filaRapida],
          ["duração", a.duracaoMin ? `${a.duracaoMin} min` : null],
          ["média da família", r.media !== null ? r.media.toFixed(1).replace(".", ",") : "sem notas ainda"],
          ["notas", notasTexto(r.votos)],
          ["notas das crianças", notasTexto(r.criancas)],
          ["descrição", a.descricao],
          ["detalhes", a.detalhes],
        ]),
      );
    }
    const doParque = infantis.filter((x) => x.atracao.parqueCode === code);
    if (doParque.length === 0) continue;
    // sem "detalhes" aqui: o prompt passaria de 100 mil tokens (preço do Haiku dobra)
    linhas.push(`### ${parque(code)} — só na lista das crianças`);
    for (const r of doParque) {
      const a = r.atracao;
      linhas.push(
        item(a.nome, [
          ["tipo", tipoLabel(a.tipo)],
          ["área", a.area],
          ["altura", alturaTexto(a.alturaMinCm)],
          ["alertas", parseAlertas(a.alertas).join(", ")],
          ["fila rápida", a.filaRapida],
          ["duração", a.duracaoMin ? `${a.duracaoMin} min` : null],
          ["média das crianças", r.media !== null ? r.media.toFixed(1).replace(".", ",") : "sem notas ainda"],
          ["notas das crianças", notasTexto(r.votos)],
          ["descrição", a.descricao],
        ]),
      );
    }
  }
  return linhas.join("\n");
}

// Bloco 2: igual pra todo logado (é o que qualquer um vê nas telas).
export async function contextoViagem(): Promise<string> {
  const secoes = await Promise.all([
    secaoRoteiro(),
    secaoVoos(),
    secaoHospedagens(),
    secaoTurma(),
    secaoMarcos(),
    secaoGuia(),
    secaoDecisoes(),
    secaoAtracoes(),
  ]);
  return `# Dados da viagem\n\n${secoes.filter(Boolean).join("\n\n")}`;
}

async function secaoFinanceiro(user: User): Promise<string> {
  const fin = await getFinanceiro(user);
  const linhas = [
    fin.admin
      ? "## Financeiro (admin: todos os núcleos; cada núcleo deve ao Murilo o valor fechado do pacote)"
      : `## Financeiro do núcleo ${user.nucleo} (o pacote é o valor fechado que o núcleo deve ao Murilo: voos + ingressos + hospedagem)`,
  ];
  if (fin.nucleos.length === 0) linhas.push("ainda sem pacote na planilha");
  for (const n of fin.nucleos) {
    linhas.push(`### Núcleo ${n.nucleo}`);
    for (const p of n.pacotes) {
      linhas.push(
        `• pacote: ${campos([
          ["descrição", p.descricao],
          ["total", p.valorTotal !== null ? moeda(p.valorTotal, p.moeda) : "ainda sem valor"],
          ["notas", p.notas],
        ])}`,
      );
    }
    for (const s of n.saldos) {
      if (n.preenchido) {
        linhas.push(`• saldo em ${s.moeda}: total ${moeda(s.total, s.moeda)} · pago ${moeda(s.pago, s.moeda)} · falta ${moeda(s.falta, s.moeda)}`);
      }
    }
    linhas.push(n.pagamentos.length ? "pagamentos recebidos:" : "nenhum pagamento lançado ainda");
    for (const p of n.pagamentos) {
      linhas.push(`  • ${[data(p.data), p.valor !== null ? moeda(p.valor, p.moeda) : null, p.descricao].filter(Boolean).join(" — ")}`);
    }
  }
  if (fin.consolidado) {
    linhas.push(
      `### A receber (todos os núcleos): ${fin.consolidado.map((s) => `${moeda(s.falta, s.moeda)} de ${moeda(s.total, s.moeda)}`).join(" · ")}`,
    );
  }
  if (fin.admin && fin.gastos.length > 0) {
    linhas.push("### Gastos do Murilo (o que ainda sai do bolso dele; só o admin vê)");
    for (const g of fin.gastos) {
      const falta = gastoFalta(g);
      linhas.push(
        item(g.item, [
          ["categoria", g.categoria],
          ["previsto", g.valorPrevisto !== null ? moeda(g.valorPrevisto, g.moeda) : "sem valor"],
          ["pago", g.valorPago !== null ? moeda(g.valorPago, g.moeda) : null],
          ["falta", falta === null ? "a orçar" : moeda(falta, g.moeda)],
          ["prazo", data(g.prazo)],
          ["status", g.status],
          ["notas", g.notas],
        ]),
      );
    }
  }
  if (fin.levar.length > 0) {
    linhas.push("### Quanto levar (dinheiro pra gastar lá)");
    for (const l of fin.levar) {
      linhas.push(
        item(l.categoria, [
          ["valor", l.valor !== null ? moeda(l.valor, l.moeda) : null],
          ["base", l.base],
          ["vale pra", l.nucleo === "todos" ? "todos" : `núcleo ${l.nucleo}`],
          ["notas", l.notas],
        ]),
      );
    }
  }
  return linhas.join("\n");
}

async function secaoCompras(user: User): Promise<string> {
  const { minha, deOutros } = await getCompras(user.id);
  const desejo = (i: (typeof minha)[number], dono: boolean) =>
    item(`${i.nome}${i.comprado ? " (já comprado)" : ""}`, [
      ["onde", i.onde],
      ["pra quem", i.paraNome ?? (dono ? "pra mim" : null)],
      ["preço estimado no Brasil", i.precoBrasil !== null ? moeda(i.precoBrasil, "BRL") : null],
      ["visibilidade", dono ? (i.publico ? "pública" : "privada (só eu vejo)") : null],
      ["notas", i.notas],
    ]);
  const linhas = ["## Lista de compras", "### Minha lista", ...(minha.length ? minha.map((i) => desejo(i, true)) : ["(vazia)"])];
  for (const g of deOutros) {
    linhas.push(`### Lista de ${g.user.name} (itens públicos)`, ...g.itens.map((i) => desejo(i, false)));
  }
  return linhas.join("\n");
}

async function secaoPendencias(): Promise<string> {
  const { abertas, auto } = await getPendencias();
  return [
    "## Pendências (só o admin vê)",
    ...abertas.map(
      (p) =>
        item(p.titulo, [
          ["categoria", p.categoria],
          ["responsável", p.responsavel],
          ["prazo", data(p.prazo)],
          ["notas", p.notas],
        ]),
    ),
    "radar automático (o que o site percebeu sozinho):",
    ...auto.map((p) => `• [${p.origem}] ${p.titulo}${p.detalhe ? ` — ${p.detalhe}` : ""}${p.prazo ? ` · ${data(p.prazo)}` : ""}`),
  ].join("\n");
}

// Bloco 3: só o que esta pessoa pode ver — vem depois do cache e muda por usuário/dia.
export async function contextoUsuario(user: User): Promise<string> {
  const hoje = hojeBrasilia();
  const faltam = diasAte(TRIP_INICIO);
  const secoes = await Promise.all([
    secaoFinanceiro(user),
    secaoCompras(user),
    user.papel === "admin" ? secaoPendencias() : Promise.resolve(""),
  ]);
  const quem = [
    "# Quem está perguntando",
    campos([
      ["nome", user.name],
      ["núcleo", user.nucleo],
      ["papel", user.papel === "admin" ? "admin (vê tudo)" : "membro"],
      ["grupo de voo", GRUPO_DO_NUCLEO[user.nucleo]],
    ]),
    `Hoje (horário de Brasília): ${data(hoje)} · ${
      faltam > 0 ? `faltam ${faltam} dias pro embarque` : faltam === 0 ? "o embarque é hoje" : "a viagem já começou"
    }`,
  ].join("\n");
  return [quem, ...secoes.filter(Boolean)].join("\n\n");
}
