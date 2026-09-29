"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ehNota } from "@/lib/atracoes";

export type NotaResult = { ok: boolean; erro?: string };

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

  revalidatePath("/roteiro", "layout");
  revalidatePath("/");
  return { ok: true };
}
