"use client";

import { useContext, useState, useTransition } from "react";
import { FecharFolha } from "@/components/Detalhe";
import { NOTAS, type Nota } from "@/lib/atracoes";
import { hexRgba } from "@/lib/parques";
import { avaliarAtracaoAction } from "./actions";

// As 4 notas em grade 2×2 (só apresentação).
export function GradeNotas({
  atual,
  onEscolher,
  grande,
}: {
  atual: number | null;
  onEscolher: (nota: Nota) => void;
  grande?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {NOTAS.map((n) => {
        const ativo = atual === n.valor;
        return (
          <button
            key={n.valor}
            type="button"
            onClick={() => onEscolher(n.valor)}
            aria-pressed={ativo}
            className={`flex items-center justify-center gap-2 rounded-[14px] border px-3 font-extrabold transition-[transform,background-color] active:scale-[0.97] ${
              grande ? "py-3.5 text-[15px]" : "py-3 text-[13.5px]"
            }`}
            style={
              ativo
                ? { borderColor: n.cor, background: hexRgba(n.cor, 0.22), color: n.cor }
                : { borderColor: "rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.05)" }
            }
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.cor }} />
            {n.label}
          </button>
        );
      })}
    </div>
  );
}

// Nota dentro da folha de detalhe: salva na hora e fecha a folha.
export default function BotoesNota({ attractionId, nota }: { attractionId: string; nota: number | null }) {
  const fecharFolha = useContext(FecharFolha);
  const [atual, setAtual] = useState(nota);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function escolher(n: Nota) {
    setAtual(n);
    setErro(null);
    startTransition(async () => {
      const r = await avaliarAtracaoAction(attractionId, n);
      if (!r.ok) {
        setAtual(nota);
        setErro(r.erro ?? "não salvou — tenta de novo");
        return;
      }
      fecharFolha?.();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
        {pending ? "Salvando…" : nota === null ? "Sua nota" : "Sua nota (toca pra trocar)"}
      </span>
      <GradeNotas atual={atual} onEscolher={escolher} />
      {erro && (
        <p className="text-[12.5px] font-bold text-nucleo-gabi" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
