// Teste de ponta a ponta do pipeline de sync com fetcher fake (sem Google).
// Roda contra o banco local: npx tsx scripts/test-sync.ts

import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { runSync } from "../src/lib/sync";

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
  Financeiro: [
    ["id", "nucleo", "item", "moeda", "valor_total", "valor_pago", "valor_restante", "notas"],
    ["f01", "pessanha", "Voos", "BRL", "R$ 18.400,00", "18400", "0", ""],
    ["f02", "gabi", "Ingressos Disney", "USD", "3,450.10", "1.725,05", "1725.05", "metade paga"],
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
    if (!values) throw new Error(`fixture sem a aba ${aba}`);
    return values;
  };
}

async function main() {
  // ── 1º sync: tudo válido ──
  const r1 = await runSync("teste-ok", fetcherDe(FIXTURE_OK));
  assert.equal(r1.ok, true, `sync 1 deveria passar: ${JSON.stringify(r1.abas)}`);
  assert.equal(r1.abas.length, 10);
  assert.equal(await db.poll.count(), 2);

  assert.equal(await db.day.count(), 3);
  assert.equal(await db.agendaItem.count(), 3);
  assert.equal(await db.flight.count(), 2);

  const r01 = await db.day.findUniqueOrThrow({ where: { id: "r01" } });
  assert.equal(r01.parqueCode, null, "XX deveria virar null");
  const r02 = await db.day.findUniqueOrThrow({ where: { id: "r02" } });
  assert.equal(r02.notas, null, "[PREENCHER] deveria virar null");

  const f01 = await db.financeItem.findUniqueOrThrow({ where: { id: "f01" } });
  assert.equal(f01.valorTotal, 18400, "R$ 18.400,00 → 18400");
  const f02 = await db.financeItem.findUniqueOrThrow({ where: { id: "f02" } });
  assert.equal(f02.valorTotal, 3450.1, "3,450.10 → 3450.10");
  assert.equal(f02.valorPago, 1725.05, "1.725,05 → 1725.05");

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
