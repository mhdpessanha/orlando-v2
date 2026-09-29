import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fotoRemota, lerFotoLocal } from "@/lib/sync/fotos";

// Foto da atração: do cache local (baixado no sync); se ainda não baixou,
// redireciona pra origem (foto_url ou miniatura do vídeo).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const local = await lerFotoLocal(id);
  if (local) {
    return new NextResponse(new Uint8Array(local.buf), {
      headers: {
        "content-type": local.tipo,
        // a URL leva ?v=<origem>, então pode ficar em cache um bom tempo
        "cache-control": "private, max-age=604800",
      },
    });
  }

  const atracao = await db.attraction.findUnique({ where: { id } });
  const remota = atracao && fotoRemota(atracao);
  if (!remota) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(remota, { status: 302, headers: { "cache-control": "no-store" } });
}
