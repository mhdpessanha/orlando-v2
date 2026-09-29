import { readdirSync, statSync } from "fs";
import path from "path";
import type { Person } from "@prisma/client";
import { avatarVariant } from "./avatars";

// Caricaturas da turma: data/avatars/<primeiro-nome>.webp (rosto, recorte quadrado)
// e <primeiro-nome>-busto.webp (busto inteiro). Ficam no volume, fora do git (o repo
// é público e tem as crianças); o site só serve pra quem está logado.
export const AVATARS_DIR = process.env.AVATARS_DIR ?? path.join(process.cwd(), "data", "avatars");

let cache: { em: number; arquivos: Map<string, number> } | null = null;

// chave → mtime (vira ?v= na URL, pra trocar a imagem sem brigar com o cache)
function arquivos(): Map<string, number> {
  if (cache && Date.now() - cache.em < 60_000) return cache.arquivos;
  const mapa = new Map<string, number>();
  try {
    for (const f of readdirSync(AVATARS_DIR)) {
      const m = f.match(/^([a-z0-9-]+)\.webp$/);
      if (m) mapa.set(m[1], statSync(path.join(AVATARS_DIR, f)).mtimeMs);
    }
  } catch {
    // pasta ainda não existe: todo mundo fica com a inicial
  }
  cache = { em: Date.now(), arquivos: mapa };
  return mapa;
}

// "Olívia" → "olivia"
export function chaveCaricatura(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0];
}

export function caricatura(nome: string, tipo: "rosto" | "busto" = "rosto"): string | null {
  const chave = chaveCaricatura(nome) + (tipo === "busto" ? "-busto" : "");
  const mtime = arquivos().get(chave);
  return mtime === undefined ? null : `/api/avatar/${chave}?v=${Math.round(mtime).toString(36)}`;
}

export type AvatarInfo = { nome: string; iniciais: string; bg: string; text: string; foto: string | null };

// `indice` = posição da pessoa dentro do núcleo (mesma variação de cor da Turma)
export function avatarDaPessoa(p: Person, indice: number): AvatarInfo {
  return {
    nome: p.nome,
    iniciais: p.iniciais ?? p.nome.charAt(0).toUpperCase(),
    ...avatarVariant(p.nucleo, indice),
    foto: caricatura(p.nome),
  };
}
