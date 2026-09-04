"use client";

import { useState } from "react";
import type { SyncResult } from "@/lib/sync";

export default function SyncButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult & { erro?: string };
      if (data.erro) {
        setMsg(data.erro);
      } else {
        const falhas = data.abas.filter((a) => a.status === "erro");
        setMsg(
          falhas.length === 0
            ? `ok · ${data.abas.filter((a) => a.status === "ok").length} abas`
            : `falhou: ${falhas.map((f) => f.aba).join(", ")}`,
        );
      }
    } catch {
      setMsg("erro de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="underline underline-offset-2 hover:text-ink-muted disabled:opacity-50"
      >
        {busy ? "sincronizando…" : "sync"}
      </button>
      {msg && <span className="max-w-[180px] truncate normal-case">{msg}</span>}
    </span>
  );
}
