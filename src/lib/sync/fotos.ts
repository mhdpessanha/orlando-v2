import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { chaveFoto, youtubeId } from "@/lib/atracoes";

// Fotos das atrações ficam no volume (data/atracoes/<id>.<ext>): o site serve
// daqui e não depende de hotlink — o link da planilha pode sumir que a foto fica.

const FOTOS_DIR = process.env.FOTOS_DIR ?? path.join(process.cwd(), "data", "atracoes");
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const TIPO: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([t, e]) => [e, t]));

type ComFoto = { id: string; fotoUrl: string | null; videoUrl: string | null };

function nomeBase(id: string): string {
  return id.replace(/[^\w-]/g, "_");
}

// foto_url da planilha; sem ela, miniaturas do vídeo da maior pra menor
// (maxresdefault não existe em todo vídeo — o YouTube responde 404).
function fontes(a: ComFoto): string[] {
  if (a.fotoUrl) return [a.fotoUrl];
  const id = youtubeId(a.videoUrl);
  return id ? ["maxresdefault", "sddefault", "hqdefault"].map((q) => `https://i.ytimg.com/vi/${id}/${q}.jpg`) : [];
}

// Enquanto o sync não baixou: manda o navegador direto pra origem.
export function fotoRemota(a: ComFoto): string | null {
  if (a.fotoUrl) return a.fotoUrl;
  const id = youtubeId(a.videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export async function lerFotoLocal(id: string): Promise<{ buf: Buffer; tipo: string } | null> {
  for (const ext of Object.keys(TIPO)) {
    try {
      const buf = await readFile(path.join(FOTOS_DIR, `${nomeBase(id)}.${ext}`));
      return { buf, tipo: TIPO[ext] };
    } catch {
      // tenta a próxima extensão
    }
  }
  return null;
}

type Download = { buf: Buffer; ext: string } | { erro: string };

async function baixar(url: string, tentativa = 1): Promise<Download> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Wikimedia pede user-agent identificável
    headers: { "user-agent": "Orlando2027/1.0 (site privado de viagem em familia)" },
  });
  // Wikimedia limita rajadas de thumbnails (429): espera e tenta de novo
  if ((res.status === 429 || res.status === 503) && tentativa < 3) {
    const espera = Math.min(Number(res.headers.get("retry-after")) || 3, 20) * 1000 * tentativa;
    await new Promise((r) => setTimeout(r, espera));
    return baixar(url, tentativa + 1);
  }
  if (!res.ok) return { erro: `HTTP ${res.status}` };
  const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!EXT[tipo]) return { erro: `tipo ${tipo || "?"}` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) return { erro: `${buf.length} bytes` };
  return { buf, ext: EXT[tipo] };
}

async function removerFotos(id: string, existentes: string[]) {
  const base = nomeBase(id);
  await Promise.all(
    existentes
      .filter((f) => f.replace(/\.\w+$/, "") === base)
      .map((f) => rm(path.join(FOTOS_DIR, f), { force: true })),
  );
}

// Baixa só o que mudou (origem diferente da já baixada, ou arquivo sumiu) e
// apaga fotos de atrações que saíram da planilha.
export async function cacheFotosAtracoes() {
  const atracoes = await db.attraction.findMany({
    select: { id: true, fotoUrl: true, videoUrl: true, fotoOrigem: true },
  });
  await mkdir(FOTOS_DIR, { recursive: true });
  const existentes = await readdir(FOTOS_DIR);
  const bases = new Set(existentes.map((f) => f.replace(/\.\w+$/, "")));

  const pendentes = atracoes.filter((a) => {
    const chave = chaveFoto(a);
    return chave !== null && (chave !== a.fotoOrigem || !bases.has(nomeBase(a.id)));
  });

  let baixadas = 0;
  const falhas: string[] = [];
  for (let i = 0; i < pendentes.length; i += 2) {
    await Promise.all(
      pendentes.slice(i, i + 2).map(async (a) => {
        let erro = "sem fonte";
        for (const url of fontes(a)) {
          const r = await baixar(url).catch((e): Download => ({ erro: e instanceof Error ? e.message : String(e) }));
          if ("erro" in r) {
            erro = r.erro;
            continue;
          }
          await removerFotos(a.id, existentes);
          await writeFile(path.join(FOTOS_DIR, `${nomeBase(a.id)}.${r.ext}`), r.buf);
          await db.attraction.update({ where: { id: a.id }, data: { fotoOrigem: chaveFoto(a) } });
          baixadas++;
          return;
        }
        falhas.push(`${a.id} (${erro})`);
      }),
    );
  }

  const manter = new Set(atracoes.filter((a) => chaveFoto(a) !== null).map((a) => nomeBase(a.id)));
  await Promise.all(
    existentes
      .filter((f) => !manter.has(f.replace(/\.\w+$/, "")))
      .map((f) => rm(path.join(FOTOS_DIR, f), { force: true })),
  );

  if (pendentes.length > 0) {
    console.log(
      `[sync] fotos das atrações: ${baixadas} baixadas` +
        (falhas.length > 0 ? `, falharam (tenta de novo no próximo sync): ${falhas.join(", ")}` : ""),
    );
  }
}
