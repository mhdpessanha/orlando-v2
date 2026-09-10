"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePreco } from "@/lib/format";

export type ItemState = { ok?: number; error?: string };

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "texto longo demais")
    .optional()
    .transform((v) => v || null);

const ItemSchema = z.object({
  nome: z.string().trim().min(1, "dá um nome pro item").max(120, "nome longo demais"),
  onde: opcional(80),
  paraPersonId: opcional(40),
  link: opcional(500),
  notas: opcional(500),
  publico: z.string().optional().transform((v) => v === "on"),
});

async function lerCampos(formData: FormData) {
  const parsed = ItemSchema.safeParse({
    nome: formData.get("nome") ?? "",
    onde: formData.get("onde") ?? "",
    paraPersonId: formData.get("paraPersonId") ?? "",
    link: formData.get("link") ?? "",
    notas: formData.get("notas") ?? "",
    publico: formData.get("publico") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "confere os campos" };

  const precoBrasil = parsePreco(String(formData.get("precoBrasil") ?? ""));
  if (Number.isNaN(precoBrasil)) return { error: "preço inválido — usa só números, tipo 249,90" };

  const d = parsed.data;
  // "pra quem" precisa existir na Turma (a aba pode mudar); senão vira "pra mim"
  const paraPersonId =
    d.paraPersonId && (await db.person.findUnique({ where: { id: d.paraPersonId } }))
      ? d.paraPersonId
      : null;
  const link = d.link && !/^https?:\/\//i.test(d.link) ? `https://${d.link}` : d.link;

  return { data: { ...d, paraPersonId, link, precoBrasil } };
}

function revalidar() {
  revalidatePath("/compras");
  revalidatePath("/");
}

export async function criarItemAction(_prev: ItemState, formData: FormData): Promise<ItemState> {
  const session = await getSession();
  if (!session) return { error: "sessão expirou — entra de novo" };
  const r = await lerCampos(formData);
  if ("error" in r) return { error: r.error };
  await db.wishItem.create({ data: { ...r.data, userId: session.userId } });
  revalidar();
  return { ok: Date.now() };
}

export async function atualizarItemAction(_prev: ItemState, formData: FormData): Promise<ItemState> {
  const session = await getSession();
  if (!session) return { error: "sessão expirou — entra de novo" };
  const id = String(formData.get("id") ?? "");
  const r = await lerCampos(formData);
  if ("error" in r) return { error: r.error };
  // só o dono edita: o where inclui userId, então item de outro vira no-op
  const { count } = await db.wishItem.updateMany({
    where: { id, userId: session.userId },
    data: r.data,
  });
  if (count === 0) return { error: "item não encontrado" };
  revalidar();
  return { ok: Date.now() };
}

export async function alternarCompradoAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const item = await db.wishItem.findFirst({ where: { id, userId: session.userId } });
  if (!item) return;
  await db.wishItem.update({ where: { id }, data: { comprado: !item.comprado } });
  revalidar();
}

export async function excluirItemAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  await db.wishItem.deleteMany({ where: { id, userId: session.userId } });
  revalidar();
}
