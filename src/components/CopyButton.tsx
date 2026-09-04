"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export default function CopyButton({ texto, label }: { texto: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // clipboard indisponível (http local etc.) — sem feedback, sem crash
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={label ?? `Copiar ${texto}`}
      className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1.5 text-[11px] font-extrabold text-gold-light active:scale-95"
    >
      {copiado ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
      {copiado ? "copiado" : "copiar"}
    </button>
  );
}
