"use client";

import { useContext, useState, useTransition } from "react";
import Avatar from "@/components/Avatar";
import { FecharFolha } from "@/components/Detalhe";
import type { AvatarInfo } from "@/lib/caricaturas";
import { NOTAS, type Nota } from "@/lib/atracoes";
import { hexRgba } from "@/lib/parques";
import { avaliarAtracaoAction, avaliarPelaCriancaAction } from "./actions";

// As 4 notas em grade 2×2 (só apresentação). `compacta` = uma linha só, menor.
export function GradeNotas({
  atual,
  onEscolher,
  grande,
  compacta,
}: {
  atual: number | null;
  onEscolher: (nota: Nota) => void;
  grande?: boolean;
  compacta?: boolean;
}) {
  return (
    <div className={compacta ? "grid grid-cols-4 gap-1.5" : "grid grid-cols-2 gap-2"}>
      {NOTAS.map((n) => {
        const ativo = atual === n.valor;
        return (
          <button
            key={n.valor}
            type="button"
            onClick={() => onEscolher(n.valor)}
            aria-pressed={ativo}
            className={`flex items-center justify-center rounded-[14px] border font-extrabold transition-[transform,background-color] active:scale-[0.97] ${
              compacta
                ? "min-h-[40px] flex-col gap-1 rounded-[12px] px-1 py-1.5 text-[10.5px] leading-tight"
                : grande
                  ? "gap-2 px-3 py-3.5 text-[15px]"
                  : "gap-2 px-3 py-3 text-[13.5px]"
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

function salvar(attractionId: string, nota: Nota, criancaId?: string) {
  return criancaId ? avaliarPelaCriancaAction(criancaId, attractionId, nota) : avaliarAtracaoAction(attractionId, nota);
}

// Nota dentro da folha de detalhe: salva na hora e fecha a folha. Com `crianca`,
// é a nota da criança, dada pelo pai/mãe.
export default function BotoesNota({
  attractionId,
  nota,
  crianca,
}: {
  attractionId: string;
  nota: number | null;
  crianca?: { id: string; nome: string };
}) {
  const fecharFolha = useContext(FecharFolha);
  const [atual, setAtual] = useState(nota);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function escolher(n: Nota) {
    setAtual(n);
    setErro(null);
    startTransition(async () => {
      const r = await salvar(attractionId, n, crianca?.id);
      if (!r.ok) {
        setAtual(nota);
        setErro(r.erro ?? "não salvou — tenta de novo");
        return;
      }
      fecharFolha?.();
    });
  }

  const quem = crianca ? `Nota de ${crianca.nome}` : "Sua nota";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
        {pending ? "Salvando…" : nota === null ? quem : `${quem} (toca pra trocar)`}
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

// Na folha do ranking das crianças: uma linha de notas por filho(a) de quem está
// logado. Não fecha a folha (dá pra dar a nota de cada um em seguida).
export function NotasPelasCriancas({
  attractionId,
  criancas,
}: {
  attractionId: string;
  criancas: { id: string; nome: string; a: AvatarInfo; nota: number | null }[];
}) {
  if (criancas.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
        Nota com as crianças
      </span>
      {criancas.map((c) => (
        <LinhaNotaCrianca key={c.id} attractionId={attractionId} crianca={c} />
      ))}
    </div>
  );
}

function LinhaNotaCrianca({
  attractionId,
  crianca,
}: {
  attractionId: string;
  crianca: { id: string; nome: string; a: AvatarInfo; nota: number | null };
}) {
  const [atual, setAtual] = useState(crianca.nota);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function escolher(n: Nota) {
    const antes = atual;
    setAtual(n);
    setErro(null);
    startTransition(async () => {
      const r = await salvar(attractionId, n, crianca.id);
      if (!r.ok) {
        setAtual(antes);
        setErro(r.erro ?? "não salvou — tenta de novo");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[12.5px] font-extrabold">
        <Avatar a={crianca.a} size={22} />
        {crianca.nome}
        {pending && <span className="text-[11px] font-bold text-ink-faint">salvando…</span>}
      </span>
      <GradeNotas compacta atual={atual} onEscolher={escolher} />
      {erro && (
        <p className="text-[12px] font-bold text-nucleo-gabi" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
