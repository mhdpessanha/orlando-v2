"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type DiaSeletor = {
  id: string;
  numero: string; // "09"
  semana: string; // "SÁB"
  cor: string | null; // cor do parque
  temPlano: boolean;
};

// Faixa de dias do plano. O dia aberto fica dourado e rola pro meio da faixa;
// dia sem plano hora a hora aparece apagado (mas abre, com o aviso).
export default function SeletorDias({ dias, ativo }: { dias: DiaSeletor[]; ativo: string }) {
  const atual = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    atual.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [ativo]);

  return (
    <nav
      aria-label="Dias do plano"
      className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {dias.map((d) => {
        const sel = d.id === ativo;
        return (
          <Link
            key={d.id}
            ref={sel ? atual : undefined}
            href={`/roteiro/${d.id}/criancas`}
            aria-current={sel ? "page" : undefined}
            className={`flex h-[58px] w-[46px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-[14px] border ${
              sel
                ? "border-gold/60 bg-gold/[0.16] text-gold-light"
                : `border-stroke bg-white/[0.04] ${d.temPlano ? "text-ink" : "text-ink-faint opacity-55"}`
            }`}
          >
            <span className="font-display text-[17px] font-semibold leading-none">{d.numero}</span>
            <span className={`text-[9px] font-extrabold ${sel ? "text-gold-light" : "text-ink-faint"}`}>
              {d.semana}
            </span>
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: d.temPlano ? (d.cor ?? "rgba(255,255,255,0.35)") : "transparent" }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
