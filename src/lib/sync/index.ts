import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchTab, sheetsIndisponivel } from "./sheets";
import { rowsToObjects, TabError } from "./parse";
import {
  agendaSchema,
  decisoesSchema,
  financeiroSchema,
  guiaSchema,
  hospedagensSchema,
  magiaSchema,
  marcosSchema,
  roteiroSchema,
  turmaSchema,
  voosSchema,
} from "./schemas";

export type TabResult = { aba: string; status: "ok" | "erro"; linhas?: number; erro?: string };
export type SyncResult = {
  ok: boolean;
  trigger: string;
  startedAt: string;
  durationMs: number;
  erro?: string;
  abas: TabResult[];
};

type RawRows = { obj: Record<string, string>; linha: number }[];
type Fetcher = (aba: string) => Promise<unknown[][]>;

// Valida linha a linha; qualquer linha inválida derruba a aba inteira (contrato),
// com mensagem apontando a linha da planilha.
function validar<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, rows: RawRows): T[] {
  const out: T[] = [];
  const erros: string[] = [];
  for (const { obj, linha } of rows) {
    const r = schema.safeParse(obj);
    if (r.success) {
      out.push(r.data);
    } else {
      const detalhe = r.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      erros.push(`linha ${linha} — ${detalhe}`);
      if (erros.length >= 5) break;
    }
  }
  if (erros.length > 0) throw new TabError(erros.join(" · "));
  return out;
}

// Espelho fiel da aba: upsert por id + delete do que sumiu, numa transação só.
function mirror<T extends { id: string }>(
  rows: T[],
  upsert: (d: T) => Prisma.PrismaPromise<unknown>,
  deleteMissing: (ids: string[]) => Prisma.PrismaPromise<unknown>,
) {
  return db.$transaction([...rows.map(upsert), deleteMissing(rows.map((r) => r.id))]);
}

type TabDef = {
  aba: string;
  headers: readonly string[];
  // colunas que podem ainda não existir na aba (viram vazias até serem criadas)
  opcionais?: readonly string[];
  processar: (rows: RawRows) => Promise<number>;
};

const TABS: TabDef[] = [
  {
    aba: "Roteiro",
    headers: ["id", "data", "dia_semana", "titulo", "parque_code", "quem", "hospedagem_noite", "early_entry", "destaque", "notas"],
    processar: async (rows) => {
      const data = validar(roteiroSchema, rows).map((r) => ({
        id: r.id,
        data: r.data,
        diaSemana: r.dia_semana,
        titulo: r.titulo,
        parqueCode: r.parque_code,
        quem: r.quem,
        hospedagemNoite: r.hospedagem_noite,
        earlyEntry: r.early_entry,
        destaque: r.destaque,
        notas: r.notas,
      }));
      await mirror(
        data,
        (d) => db.day.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.day.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Agenda",
    headers: ["id", "roteiro_id", "periodo", "ordem", "titulo", "local", "detalhe", "chip"],
    processar: async (rows) => {
      const data = validar(agendaSchema, rows).map((r) => ({
        id: r.id,
        roteiroId: r.roteiro_id,
        periodo: r.periodo,
        ordem: r.ordem,
        titulo: r.titulo,
        local: r.local,
        detalhe: r.detalhe,
        chip: r.chip,
      }));
      await mirror(
        data,
        (d) => db.agendaItem.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.agendaItem.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Voos",
    headers: ["id", "grupo", "status", "trecho", "data", "voo", "origem", "destino", "saida", "chegada", "reserva", "notas"],
    opcionais: ["bilhete", "bagagem", "assentos", "detalhes"],
    processar: async (rows) => {
      const data = validar(voosSchema, rows).map((r) => ({
        id: r.id,
        grupo: r.grupo,
        status: r.status,
        trecho: r.trecho,
        data: r.data,
        voo: r.voo,
        origem: r.origem,
        destino: r.destino,
        saida: r.saida,
        chegada: r.chegada,
        reserva: r.reserva,
        notas: r.notas,
        bilhete: r.bilhete,
        bagagem: r.bagagem,
        assentos: r.assentos,
        detalhes: r.detalhes,
      }));
      await mirror(
        data,
        (d) => db.flight.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.flight.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Hospedagens",
    headers: ["id", "nome", "tipo", "checkin", "checkout", "quem", "status", "confirmacao", "notas"],
    opcionais: ["endereco", "detalhes"],
    processar: async (rows) => {
      const data = validar(hospedagensSchema, rows).map((r) => ({
        id: r.id,
        nome: r.nome,
        tipo: r.tipo,
        checkin: r.checkin,
        checkout: r.checkout,
        quem: r.quem,
        status: r.status,
        confirmacao: r.confirmacao,
        notas: r.notas,
        endereco: r.endereco,
        detalhes: r.detalhes,
      }));
      await mirror(
        data,
        (d) => db.accommodation.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.accommodation.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Turma",
    headers: ["id", "nome", "nucleo", "tipo", "papel", "iniciais", "aniversario", "tagline"],
    processar: async (rows) => {
      const data = validar(turmaSchema, rows).map((r) => ({
        id: r.id,
        nome: r.nome,
        nucleo: r.nucleo,
        tipo: r.tipo,
        papel: r.papel,
        iniciais: r.iniciais,
        aniversario: r.aniversario,
        tagline: r.tagline,
      }));
      await mirror(
        data,
        (d) => db.person.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.person.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Marcos",
    headers: ["id", "data", "hora", "titulo", "categoria", "status", "descricao"],
    processar: async (rows) => {
      const data = validar(marcosSchema, rows).map((r) => ({
        id: r.id,
        data: r.data,
        hora: r.hora,
        titulo: r.titulo,
        categoria: r.categoria,
        status: r.status,
        descricao: r.descricao,
      }));
      await mirror(
        data,
        (d) => db.milestone.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.milestone.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Guia",
    headers: ["id", "secao", "ordem", "titulo", "conteudo"],
    opcionais: ["detalhes"],
    processar: async (rows) => {
      const data = validar(guiaSchema, rows).map((r) => ({
        id: r.id,
        secao: r.secao,
        ordem: r.ordem,
        titulo: r.titulo,
        conteudo: r.conteudo,
        detalhes: r.detalhes,
      }));
      await mirror(
        data,
        (d) => db.guideEntry.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.guideEntry.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Financeiro",
    headers: ["id", "nucleo", "item", "moeda", "valor_total", "valor_pago", "valor_restante", "notas"],
    processar: async (rows) => {
      const data = validar(financeiroSchema, rows).map((r) => ({
        id: r.id,
        nucleo: r.nucleo,
        item: r.item,
        moeda: r.moeda,
        valorTotal: r.valor_total,
        valorPago: r.valor_pago,
        valorRestante: r.valor_restante,
        notas: r.notas,
      }));
      await mirror(
        data,
        (d) => db.financeItem.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.financeItem.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Decisoes",
    headers: ["id", "ordem", "pergunta", "detalhe", "opcoes", "status", "encerra_em"],
    opcionais: ["explicacao"],
    processar: async (rows) => {
      const data = validar(decisoesSchema, rows).map((r) => ({
        id: r.id,
        ordem: r.ordem,
        pergunta: r.pergunta,
        detalhe: r.detalhe,
        opcoes: r.opcoes,
        status: r.status,
        encerraEm: r.encerra_em,
        explicacao: r.explicacao,
      }));
      await mirror(
        data,
        (d) => db.poll.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.poll.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
  {
    aba: "Magia",
    headers: ["id", "ordem", "tema", "texto"],
    processar: async (rows) => {
      const data = validar(magiaSchema, rows).map((r) => ({
        id: r.id,
        ordem: r.ordem,
        tema: r.tema,
        texto: r.texto,
      }));
      await mirror(
        data,
        (d) => db.magicFact.upsert({ where: { id: d.id }, update: d, create: d }),
        (ids) => db.magicFact.deleteMany({ where: { id: { notIn: ids } } }),
      );
      return data.length;
    },
  },
];

let emAndamento: Promise<SyncResult> | null = null;

// Uma execução por vez; chamadas concorrentes recebem a mesma promise.
export function runSync(trigger: string, fetcher: Fetcher = fetchTab): Promise<SyncResult> {
  if (emAndamento) return emAndamento;
  emAndamento = doSync(trigger, fetcher).finally(() => {
    emAndamento = null;
  });
  return emAndamento;
}

async function doSync(trigger: string, fetcher: Fetcher): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Fetcher injetado (testes) dispensa credenciais do Google.
  const indisponivel = fetcher === fetchTab ? sheetsIndisponivel() : null;
  if (indisponivel) {
    console.warn(`[sync] não rodou (${trigger}): ${indisponivel}`);
    await db.syncLog.create({ data: { aba: "*", status: "erro", erro: indisponivel } }).catch(() => {});
    return { ok: false, trigger, startedAt, durationMs: Date.now() - t0, erro: indisponivel, abas: [] };
  }

  const abas: TabResult[] = [];
  for (const tab of TABS) {
    try {
      const values = await fetcher(tab.aba);
      const rows = rowsToObjects(values, tab.headers, tab.opcionais);
      const linhas = await tab.processar(rows);
      abas.push({ aba: tab.aba, status: "ok", linhas });
      await db.syncLog.create({ data: { aba: tab.aba, status: "ok" } });
    } catch (e) {
      // Falhou (rede, validação, o que for): mantém os dados anteriores da aba e segue.
      const erro = e instanceof Error ? e.message : String(e);
      abas.push({ aba: tab.aba, status: "erro", erro });
      console.error(`[sync] aba ${tab.aba}: ${erro}`);
      await db.syncLog.create({ data: { aba: tab.aba, status: "erro", erro } }).catch(() => {});
    }
  }

  await db.syncLog
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } })
    .catch(() => {});

  const result: SyncResult = {
    ok: abas.every((a) => a.status === "ok"),
    trigger,
    startedAt,
    durationMs: Date.now() - t0,
    abas,
  };
  console.log(
    `[sync] ${trigger}: ${result.ok ? "ok" : "com falhas"} em ${result.durationMs}ms — ` +
      abas.map((a) => `${a.aba}=${a.status === "ok" ? a.linhas : "ERRO"}`).join(" "),
  );
  return result;
}

const INTERVALO_MS = 30 * 60 * 1000;
const g = globalThis as unknown as { __orlandoSyncScheduler?: boolean };

// Chamado uma vez no boot do server (instrumentation). Guard contra hot-reload do dev.
export function startSyncScheduler() {
  if (g.__orlandoSyncScheduler) return;
  g.__orlandoSyncScheduler = true;
  setTimeout(() => {
    void runSync("boot");
  }, 3_000);
  setInterval(() => {
    void runSync("intervalo");
  }, INTERVALO_MS);
}
