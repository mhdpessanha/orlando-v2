"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

export type OpcaoPlano = {
  letra: string;
  titulo: string;
  quem: string | null;
  conteudo: ReactNode; // os cards completos da opção (vêm prontos do server)
};

// Planos A, B e C do mesmo horário: o primeiro (A) já vem aberto; os outros
// aparecem numa linha cada (letra + título + com quem) e abrem ao toque.
export default function Alternativas({ opcoes, cor }: { opcoes: OpcaoPlano[]; cor: string }) {
  const [abertas, setAbertas] = useState<string[]>([opcoes[0].letra]);
  const alternar = (letra: string) =>
    setAbertas((atual) => (atual.includes(letra) ? atual.filter((l) => l !== letra) : [...atual, letra]));

  return (
    <div className="flex flex-col gap-2 rounded-card border border-dashed border-[rgba(255,255,255,0.2)] bg-white/[0.025] p-2">
      <span className="px-1.5 pt-1 text-[9.5px] font-extrabold uppercase tracking-[2px] text-ink-faint">
        {opcoes.length} opções pra esse horário
      </span>
      {opcoes.map((o) => {
        const aberta = abertas.includes(o.letra);
        return (
          <div key={o.letra} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => alternar(o.letra)}
              aria-expanded={aberta}
              className="flex items-center gap-2.5 rounded-[13px] px-1.5 py-1 text-left active:bg-white/[0.06]"
            >
              <span
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-display text-[14px] font-semibold text-night-deep"
                style={{ background: cor, opacity: aberta ? 1 : 0.75 }}
              >
                {o.letra}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className={`text-[13px] font-extrabold ${aberta ? "text-ink-soft" : "text-ink"}`}>
                  {aberta ? `Plano ${o.letra}` : o.titulo}
                </span>
                {!aberta && o.quem && (
                  <span className="truncate text-[11.5px] font-semibold text-ink-muted">{o.quem}</span>
                )}
              </span>
              <ChevronRightIcon
                width={15}
                height={15}
                strokeWidth={2.2}
                className={`shrink-0 text-ink-faint transition-transform ${aberta ? "rotate-90" : ""}`}
              />
            </button>
            {aberta && <div className="flex flex-col gap-2">{o.conteudo}</div>}
          </div>
        );
      })}
    </div>
  );
}
