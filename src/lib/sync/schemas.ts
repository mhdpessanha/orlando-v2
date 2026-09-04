import { z } from "zod";
import { parseNumeroBR } from "./parse";

export const PARQUES = ["MK", "EP", "AK", "HS", "USF", "IOA", "EPIC", "SW", "PEPPA"] as const;
export const PERIODOS = ["manha", "tarde", "noite"] as const;
export const GRUPOS_VOO = ["familia", "gabi", "vm"] as const;
export const NUCLEOS = ["pessanha", "gabi", "vitor", "mariana"] as const;
export const TIPOS_PESSOA = ["adulto", "crianca"] as const;
export const PAPEIS = ["admin", "membro", "perfil"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// aceita o marcador de chegada no dia seguinte: "05:51 (+1)"
const TIME_RE = /^\d{1,2}:\d{2}(\s*\(\+1\))?$/;
// aniversário pode vir sem ano: "11/01" (convenção da aba Turma)
const ANIV_RE = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2})$/;

const req = z.string().min(1, "obrigatório");
const opt = z.string().transform((s) => (s === "" ? null : s));

const dateReq = req.regex(DATE_RE, "data deve ser AAAA-MM-DD");
const dateOpt = opt.refine((v) => v === null || DATE_RE.test(v), "data deve ser AAAA-MM-DD");
const timeOpt = opt.refine((v) => v === null || TIME_RE.test(v), "hora deve ser HH:MM");
const anivOpt = opt.refine(
  (v) => v === null || ANIV_RE.test(v),
  "aniversário deve ser AAAA-MM-DD ou DD/MM",
);

// status etc.: string curta, sem lista fechada — não travar o sync por vocabulário novo
const curtaOpt = opt.refine((v) => v === null || v.length <= 60, "texto longo demais pra este campo");

const intReq = req.regex(/^\d+$/, "deve ser um inteiro").transform(Number);

const numOpt = opt
  .transform((v) => (v === null ? null : parseNumeroBR(v)))
  .refine((v) => v === null || Number.isFinite(v), "número inválido");

const enumReq = <T extends readonly string[]>(vals: T) =>
  req.refine((v): v is T[number] => vals.includes(v), `deve ser um de: ${vals.join(", ")}`);

const enumOpt = <T extends readonly string[]>(vals: T) =>
  opt.refine((v): v is T[number] | null => v === null || vals.includes(v), `deve ser um de: ${vals.join(", ")}`);

// Chaves = cabeçalhos exatos da linha 1 de cada aba (o contrato do CLAUDE.md).

export const roteiroSchema = z.object({
  id: req,
  data: dateReq,
  dia_semana: opt,
  titulo: req,
  parque_code: enumOpt(PARQUES),
  quem: opt,
  hospedagem_noite: opt,
  early_entry: opt,
  destaque: opt,
  notas: opt,
});

export const agendaSchema = z.object({
  id: req,
  roteiro_id: req,
  periodo: enumReq(PERIODOS),
  ordem: intReq,
  titulo: req,
  local: opt,
  detalhe: opt,
  chip: opt,
});

export const voosSchema = z.object({
  id: req,
  grupo: enumReq(GRUPOS_VOO),
  status: curtaOpt,
  trecho: opt,
  data: dateOpt,
  voo: opt,
  origem: opt,
  destino: opt,
  saida: timeOpt,
  chegada: timeOpt,
  reserva: opt,
  notas: opt,
  // colunas opcionais (detalhe do voo no site)
  bilhete: opt,
  bagagem: opt,
  assentos: opt,
  detalhes: opt,
});

export const hospedagensSchema = z.object({
  id: req,
  nome: req,
  tipo: opt,
  checkin: dateOpt,
  checkout: dateOpt,
  quem: opt,
  status: curtaOpt,
  confirmacao: opt,
  notas: opt,
  // colunas opcionais (detalhe da estadia no site)
  endereco: opt,
  detalhes: opt,
});

export const turmaSchema = z.object({
  id: req,
  nome: req,
  nucleo: enumReq(NUCLEOS),
  tipo: enumReq(TIPOS_PESSOA),
  papel: enumReq(PAPEIS),
  iniciais: opt,
  aniversario: anivOpt,
  tagline: opt,
});

export const marcosSchema = z.object({
  id: req,
  data: dateOpt,
  hora: timeOpt,
  titulo: req,
  categoria: opt,
  status: curtaOpt,
  descricao: opt,
});

export const guiaSchema = z.object({
  id: req,
  secao: req,
  ordem: intReq,
  titulo: req,
  conteudo: opt,
  // coluna opcional (texto longo do card expandido)
  detalhes: opt,
});

export const financeiroSchema = z.object({
  id: req,
  nucleo: enumReq(NUCLEOS),
  item: req,
  moeda: curtaOpt,
  valor_total: numOpt,
  valor_pago: numOpt,
  valor_restante: numOpt,
  notas: opt,
});

export const magiaSchema = z.object({
  id: req,
  ordem: intReq,
  tema: opt,
  texto: req,
});

export const decisoesSchema = z.object({
  id: req,
  ordem: intReq,
  pergunta: req,
  detalhe: opt,
  opcoes: req.refine(
    (v) => v.split("|").map((s) => s.trim()).filter(Boolean).length >= 2,
    "precisa de pelo menos 2 opções separadas por |",
  ),
  status: curtaOpt,
  encerra_em: dateOpt,
  // coluna opcional (explicação longa, abre ao tocar na pergunta)
  explicacao: opt,
});
