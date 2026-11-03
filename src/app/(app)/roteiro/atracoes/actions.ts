"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALTURA_MAX_CM, ALTURA_MIN_CM, ehNota } from "@/lib/atracoes";
import { aguardarSync } from "@/lib/sync";
import { escreverCelula, fetchTab, letraColuna, sheetsIndisponivel } from "@/lib/sync/sheets";

export type NotaResult = { ok: boolean; erro?: string };

function revalidar() {
  revalidatePath("/roteiro", "layout");
  revalidatePath("/");
}

// Cada toque salva na hora: dá pra parar no meio e continuar depois (em qualquer aparelho).
export async function avaliarAtracaoAction(attractionId: string, nota: number): Promise<NotaResult> {
  const session = await getSession();
  if (!session) return { ok: false, erro: "sessão expirou — entra de novo" };
  if (!ehNota(nota)) return { ok: false, erro: "nota inválida" };
  const atracao = await db.attraction.findUnique({ where: { id: attractionId }, select: { id: true } });
  if (!atracao) return { ok: false, erro: "essa atração saiu da lista" };

  await db.attractionRating.upsert({
    where: { userId_attractionId: { userId: session.userId, attractionId } },
    update: { nota },
    create: { userId: session.userId, attractionId, nota },
  });

  revalidar();
  return { ok: true };
}

// Criança do núcleo de quem está logado — só os pais dão nota e mexem na altura.
async function criancaDosPais(personId: string) {
  const session = await getSession();
  if (!session) return { erro: "sessão expirou — entra de novo" } as const;
  const pessoa = await db.person.findUnique({ where: { id: personId } });
  if (!pessoa || pessoa.tipo !== "crianca") return { erro: "criança não encontrada" } as const;
  if (pessoa.nucleo !== session.user.nucleo) {
    return { erro: `só os pais de ${pessoa.nome} mexem aqui` } as const;
  }
  return { session, pessoa } as const;
}

// Nota da criança (dada pelo pai ou pela mãe): uma por criança/atração, vale o último toque.
export async function avaliarPelaCriancaAction(
  personId: string,
  attractionId: string,
  nota: number,
): Promise<NotaResult> {
  const r = await criancaDosPais(personId);
  if ("erro" in r) return { ok: false, erro: r.erro };
  if (!ehNota(nota)) return { ok: false, erro: "nota inválida" };
  const atracao = await db.attraction.findUnique({ where: { id: attractionId }, select: { id: true } });
  if (!atracao) return { ok: false, erro: "essa atração saiu da lista" };

  await db.childRating.upsert({
    where: { personId_attractionId: { personId, attractionId } },
    update: { nota, porUserId: r.session.userId },
    create: { personId, attractionId, nota, porUserId: r.session.userId },
  });

  revalidar();
  return { ok: true };
}

// A ÚNICA escrita do site na planilha (exceção consciente à mão única): a altura da
// criança vai pra coluna altura_cm da Turma, e o banco é atualizado na hora. A
// planilha continua sendo a fonte — se alguém mudar lá, o próximo sync traz.
export async function salvarAlturaAction(personId: string, alturaCm: number): Promise<NotaResult> {
  const r = await criancaDosPais(personId);
  if ("erro" in r) return { ok: false, erro: r.erro };
  if (!Number.isInteger(alturaCm) || alturaCm < ALTURA_MIN_CM || alturaCm > ALTURA_MAX_CM) {
    return { ok: false, erro: `altura em centímetros, entre ${ALTURA_MIN_CM} e ${ALTURA_MAX_CM}` };
  }
  if (sheetsIndisponivel()) return { ok: false, erro: "a planilha está fora de alcance agora — tenta mais tarde" };

  try {
    // um sync que já leu a Turma gravaria a altura antiga por cima: espera ele acabar
    await aguardarSync();
    const valores = await fetchTab("Turma");
    const cabecalho = (valores[0] ?? []).map((h) => String(h ?? "").trim());
    const colId = cabecalho.indexOf("id");
    const colAltura = cabecalho.indexOf("altura_cm");
    if (colId < 0 || colAltura < 0) {
      return { ok: false, erro: "a aba Turma da planilha não tem a coluna altura_cm" };
    }
    const linha = valores.findIndex((row, i) => i > 0 && String(row[colId] ?? "").trim() === personId);
    if (linha < 0) return { ok: false, erro: `não achei ${r.pessoa.nome} na aba Turma` };
    await escreverCelula("Turma", `${letraColuna(colAltura)}${linha + 1}`, alturaCm);
  } catch (e) {
    console.error(`[altura] ${r.pessoa.nome}: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, erro: "não consegui salvar na planilha — tenta de novo daqui a pouco" };
  }

  await db.person.update({ where: { id: personId }, data: { alturaCm } });
  console.log(`[altura] ${r.session.user.username} → ${r.pessoa.nome}: ${alturaCm} cm`);
  revalidar();
  revalidatePath("/turma");
  return { ok: true };
}
