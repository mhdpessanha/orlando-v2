import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { hexRgba, PARQUE_INFO } from "@/lib/parques";

export type ParqueProgresso = { code: string; minhas: number; total: number };

const R = 16;
const VOLTA = 2 * Math.PI * R;

// Todos os parques lado a lado, sem rolar (senão ninguém vê que tem mais de
// um): anel de progresso na cor do parque, check nos completos, o atual
// destacado. Um toque troca de parque. Sem hooks — serve no server e no client.
export default function TrilhaParques({
  parques,
  ativo,
  href,
}: {
  parques: ParqueProgresso[];
  ativo: string;
  href: (code: string) => string;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${Math.min(parques.length, 7)}, minmax(0, 1fr))` }}
    >
      {parques.map((p) => {
        const info = PARQUE_INFO[p.code];
        const cor = info?.cor ?? "#b7a9e8";
        const atual = p.code === ativo;
        const completo = p.total > 0 && p.minhas >= p.total;
        const frac = p.total > 0 ? Math.min(p.minhas / p.total, 1) : 0;
        return (
          <Link
            key={p.code}
            href={href(p.code)}
            aria-current={atual ? "page" : undefined}
            aria-label={`${info?.nome ?? p.code}: sua nota em ${p.minhas} de ${p.total}`}
            className="flex flex-col items-center gap-1 rounded-[14px] border py-1.5 transition-colors"
            style={
              atual
                ? { borderColor: hexRgba(cor, 0.55), background: hexRgba(cor, 0.14) }
                : { borderColor: "transparent" }
            }
          >
            <span className="relative block h-[38px] w-[38px]">
              <svg viewBox="0 0 38 38" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                {frac > 0 && (
                  <circle
                    cx="19"
                    cy="19"
                    r={R}
                    fill="none"
                    stroke={cor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={VOLTA}
                    strokeDashoffset={VOLTA * (1 - frac)}
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                )}
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tracking-[0.3px]"
                style={{ color: cor }}
              >
                {p.code}
              </span>
              {completo && (
                <span
                  className="absolute -right-1 -top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full"
                  style={{ background: cor, boxShadow: "0 0 0 2px #101641" }}
                >
                  <CheckIcon width={10} height={10} strokeWidth={3} className="text-night-deep" />
                </span>
              )}
            </span>
            <span className={`text-[10px] font-bold leading-none ${atual ? "text-ink" : "text-ink-faint"}`}>
              {p.minhas}/{p.total}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
