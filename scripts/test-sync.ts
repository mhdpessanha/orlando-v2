// Teste de ponta a ponta do pipeline de sync com fetcher fake (sem Google).
// Roda contra o banco local: npx tsx scripts/test-sync.ts

import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { runSync } from "../src/lib/sync";
import { AbaNaoEncontrada } from "../src/lib/sync/sheets";

type Fixture = Record<string, unknown[][]>;

const FIXTURE_OK: Fixture = {
  Roteiro: [
    ["id", "data", "dia_semana", "titulo", "parque_code", "quem", "hospedagem_noite", "early_entry", "destaque", "notas", "coluna_extra"],
    ["r01", "2027-01-08", "sex", "Chegada em Orlando", "XX", "todos", "Kidani Village", "", "savana na janela", "", "ignorar isto"],
    ["r02", "2027-01-09", "sab", "Animal Kingdom", "AK", "todos", "Kidani Village", "sim", "", "[PREENCHER]", ""],
    ["r03", "2027-01-10", "dom", "Magic Kingdom", "MK", "todos", "Kidani Village", "sim", "primeiro dia de castelo", "", ""],
  ],
  Agenda: [
    ["id", "roteiro_id", "periodo", "ordem", "titulo", "local", "detalhe", "chip"],
    ["a01", "r02", "manha", "1", "Brunch no Tusker House", "Animal Kingdom", "XXXXXX", "ADR"],
    ["a02", "r02", "tarde", "2", "Kilimanjaro Safaris", "", "", ""],
    ["a03", "r03", "noite", "1", "Fogos no castelo", "Magic Kingdom", "", ""],
  ],
  Voos: [
    ["id", "grupo", "status", "trecho", "data", "voo", "origem", "destino", "saida", "chegada", "reserva", "notas"],
    ["v01", "familia", "emitido", "GIG-MCO", "2027-01-07", "LA8180", "GIG", "MCO", "21:05", "05:51 (+1)", "ABC123", ""],
    ["v02", "gabi", "pendente", "", "XX", "", "", "", "", "", "XX", ""],
  ],
  Hospedagens: [
    ["id", "nome", "tipo", "checkin", "checkout", "quem", "status", "confirmacao", "notas"],
    ["h01", "Kidani Village", "resort disney", "2027-01-08", "2027-01-12", "todos", "confirmado", "K-9981", ""],
  ],
  Turma: [
    ["id", "nome", "nucleo", "tipo", "papel", "iniciais", "aniversario", "tagline"],
    ["p01", "Murilo", "pessanha", "adulto", "admin", "MP", "1988-05-02", "o planejador"],
    ["p02", "Olívia", "pessanha", "crianca", "perfil", "OP", "15/03", "primeira viagem"],
  ],
  Marcos: [
    ["id", "data", "hora", "titulo", "categoria", "status", "descricao"],
    ["m01", "2026-11-09", "", "Reservas de restaurantes", "adr", "pendente", "janela das ADRs"],
    ["m02", "", "", "Compra dos ingressos Universal", "ingresso", "pendente", "sem data ainda"],
  ],
  Guia: [
    ["id", "secao", "ordem", "titulo", "conteudo"],
    ["g01", "aeroporto", "1", "Imigração", "MPC no celular antes da fila"],
  ],
  Pacote: [
    ["id", "nucleo", "descricao", "moeda", "valor_total", "notas"],
    ["pc01", "gabi", "Pacote completo", "BRL", "R$ 18.400,00", ""],
    ["pc02", "vitor", "Pacote completo", "USD", "3,450.10", ""],
  ],
  Pagamentos: [
    ["id", "nucleo", "data", "moeda", "valor", "descricao"],
    ["pg01", "gabi", "2026-08-01", "BRL", "18400", "quitado"],
    ["pg02", "vitor", "2026-08-15", "USD", "1.725,05", "metade"],
  ],
  Gastos: [
    ["id", "item", "categoria", "moeda", "valor_previsto", "valor_pago", "prazo", "status", "notas"],
    ["g01", "Hotel VM", "hospedagem", "USD", "1200", "", "2026-10-01", "", ""],
  ],
  Levar: [
    ["id", "nucleo", "categoria", "moeda", "valor", "base", "notas"],
    ["lv01", "todos", "Alimentação", "USD", "120", "por dia por adulto", ""],
    ["lv02", "gabi", "Compras", "USD", "500", "total", ""],
  ],
  Magia: [
    ["id", "ordem", "tema", "texto"],
    ["mg1", "1", "castelo", "O Castelo da Cinderela tem 57 metros e nenhum tijolo."],
    ["mg2", "2", "epcot", "A esfera do EPCOT tem 11.324 painéis de alumínio."],
  ],
  Decisoes: [
    ["id", "ordem", "pergunta", "detalhe", "opcoes", "status", "encerra_em"],
    ["d01", "1", "Dia 17: qual parque?", "", "IOA|Epic Universe", "", "2026-12-01"],
    ["d02", "2", "Jantar do dia 23?", "última noite", "Churrasco em casa|Disney Springs", "fechada", ""],
  ],
};

function fetcherDe(fixture: Fixture) {
  return async (aba: string) => {
    const values = fixture[aba];
    if (!values) throw new AbaNaoEncontrada(`fixture sem a aba ${aba}`);
    return values;
  };
}

async function main() {
  // ── 1º sync: tudo válido ──
  const r1 = await runSync("teste-ok", fetcherDe(FIXTURE_OK));
  assert.equal(r1.ok, true, `sync 1 deveria passar: ${JSON.stringify(r1.abas)}`);
  assert.equal(r1.abas.length, 14);
  assert.equal(await db.poll.count(), 2);
  // aba opcional ausente na fixture (Pendencias) não é erro
  assert.equal(r1.abas.find((a) => a.aba === "Pendencias")?.status, "ausente");

  assert.equal(await db.day.count(), 3);
  assert.equal(await db.agendaItem.count(), 3);
  assert.equal(await db.flight.count(), 2);

  const r01 = await db.day.findUniqueOrThrow({ where: { id: "r01" } });
  assert.equal(r01.parqueCode, null, "XX deveria virar null");
  const r02 = await db.day.findUniqueOrThrow({ where: { id: "r02" } });
  assert.equal(r02.notas, null, "[PREENCHER] deveria virar null");

  const pc01 = await db.package.findUniqueOrThrow({ where: { id: "pc01" } });
  assert.equal(pc01.valorTotal, 18400, "R$ 18.400,00 → 18400");
  const pc02 = await db.package.findUniqueOrThrow({ where: { id: "pc02" } });
  assert.equal(pc02.valorTotal, 3450.1, "3,450.10 → 3450.10");
  const pg02 = await db.payment.findUniqueOrThrow({ where: { id: "pg02" } });
  assert.equal(pg02.valor, 1725.05, "1.725,05 → 1725.05");
  assert.equal(await db.expense.count(), 1);
  assert.equal(await db.budgetHint.count(), 2);

  const v02 = await db.flight.findUniqueOrThrow({ where: { id: "v02" } });
  assert.equal(v02.data, null, "XX em data → null");
  const v01 = await db.flight.findUniqueOrThrow({ where: { id: "v01" } });
  assert.equal(v01.chegada, "05:51 (+1)", "chegada com marcador (+1) aceita");
  const p02 = await db.person.findUniqueOrThrow({ where: { id: "p02" } });
  assert.equal(p02.aniversario, "15/03", "aniversário DD/MM aceito");

  // ── 2º sync: Roteiro quebrado (cabeçalho sumiu), Voos com linha inválida,
  //    Agenda com linha removida ──
  const quebrada: Fixture = structuredClone(FIXTURE_OK);
  quebrada.Roteiro = [
    ["id", "data", "dia_semana", "parque_code", "quem", "hospedagem_noite", "early_entry", "destaque", "notas"],
    ["r99", "2027-01-08", "sex", "", "", "", "", "", ""],
  ];
  quebrada.Voos = [
    FIXTURE_OK.Voos[0],
    ["v01", "grupo_invalido", "", "", "", "", "", "", "", "", "", ""],
  ];
  quebrada.Agenda = FIXTURE_OK.Agenda.slice(0, 3); // some a03

  const r2 = await runSync("teste-falhas", fetcherDe(quebrada));
  assert.equal(r2.ok, false);
  const porAba = Object.fromEntries(r2.abas.map((a) => [a.aba, a]));
  assert.equal(porAba.Roteiro.status, "erro");
  assert.match(porAba.Roteiro.erro!, /cabeçalho ausente: titulo/);
  assert.equal(porAba.Voos.status, "erro");
  assert.match(porAba.Voos.erro!, /linha 2/);
  assert.equal(porAba.Agenda.status, "ok");

  // aba que falhou mantém os dados anteriores
  assert.equal(await db.day.count(), 3, "Roteiro falhou → dados antigos intactos");
  assert.equal(await db.flight.count(), 2, "Voos falhou → dados antigos intactos");
  assert.ok(await db.day.findUnique({ where: { id: "r01" } }), "r01 ainda existe");
  // aba ok espelha: a03 sumiu da planilha → sai do banco
  assert.equal(await db.agendaItem.count(), 2, "a03 removida no sync");
  assert.equal(await db.agendaItem.findUnique({ where: { id: "a03" } }), null);

  // SyncLog registrou as falhas
  const logsErro = await db.syncLog.findMany({
    where: { status: "erro", aba: { in: ["Roteiro", "Voos"] } },
    orderBy: { id: "desc" },
    take: 2,
  });
  assert.equal(logsErro.length, 2, "SyncLog com as 2 falhas");

  // ── 3º sync: fixture válida de novo, banco volta ao estado completo ──
  const r3 = await runSync("teste-restaura", fetcherDe(FIXTURE_OK));
  assert.equal(r3.ok, true);
  assert.equal(await db.agendaItem.count(), 3);

  console.log("✓ pipeline de sync: parse, validação, espelho, falha isolada e SyncLog — tudo ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
