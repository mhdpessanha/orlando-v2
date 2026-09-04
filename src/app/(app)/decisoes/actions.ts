"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseOpcoes, pollAberta } from "@/lib/queries";

export async function votarAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;

  const pollId = String(formData.get("pollId") ?? "");
  const opcao = String(formData.get("opcao") ?? "");

  const poll = await db.poll.findUnique({ where: { id: pollId } });
  if (!poll || !pollAberta(poll) || !parseOpcoes(poll.opcoes).includes(opcao)) return;

  await db.vote.upsert({
    where: { userId_pollId: { userId: session.userId, pollId } },
    update: { choice: opcao },
    create: { userId: session.userId, pollId, choice: opcao },
  });

  revalidatePath("/decisoes");
  revalidatePath("/");
}
