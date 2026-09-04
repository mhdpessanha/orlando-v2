import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runSync } from "@/lib/sync";

export async function POST() {
  const session = await getSession();
  if (!session || session.user.papel !== "admin") {
    return NextResponse.json({ erro: "só o admin pode sincronizar" }, { status: 403 });
  }
  const result = await runSync("manual");
  return NextResponse.json(result, { status: result.erro ? 503 : 200 });
}
