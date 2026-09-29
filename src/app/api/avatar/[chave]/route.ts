import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AVATARS_DIR } from "@/lib/caricaturas";

// Caricatura da turma: só pra quem está logado (tem as crianças).
export async function GET(_req: Request, { params }: { params: Promise<{ chave: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  const { chave } = await params;
  if (!/^[a-z0-9-]+$/.test(chave)) return new NextResponse(null, { status: 404 });
  try {
    const buf = await readFile(path.join(AVATARS_DIR, `${chave}.webp`));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "image/webp",
        // a URL leva ?v=<mtime>, então pode ficar em cache
        "cache-control": "private, max-age=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
