"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import type { Attraction } from "@prisma/client";
import { Folha } from "@/components/Detalhe";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, RulerIcon, SparkleIcon } from "@/components/icons";
import { resumoCriancas, tipoLabel, type Crianca, type Nota } from "@/lib/atracoes";
import { avaliarAtracaoAction } from "./actions";
import { GradeNotas } from "./BotoesNota";
import DetalheAtracao, { Alertas } from "./DetalheAtracao";
import FotoAtracao from "./FotoAtracao";

type Props = {
  parque: { code: string; nome: string; cor: string };
  itens: { a: Attraction; foto: string | null }[];
  notasIniciais: Record<string, number>;
  criancas: Crianca[];
  proximo: { code: string; nome: string; faltam: number } | null;
};

// Modo rápido: uma atração por vez, 4 botões grandes. Cada toque salva no
// servidor e pula pra próxima sem nota.
export default function Classificador({ parque, itens, notasIniciais, criancas, proximo }: Props) {
  const [notas, setNotas] = useState<Record<string, number>>(notasIniciais);
  const proximaSemNota = useCallback(
    (depoisDe: number, n: Record<string, number>): number | null => {
      for (let k = 1; k <= itens.length; k++) {
        const j = (depoisDe + k) % itens.length;
        if (n[itens[j].a.id] === undefined) return j;
      }
      return null;
    },
    [itens],
  );
  // começa na primeira sem nota; null = parque completo
  const [idx, setIdx] = useState<number | null>(() => proximaSemNota(-1, notasIniciais));
  const [folha, setFolha] = useState(false);
  const fecharFolha = useCallback(() => setFolha(false), []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvos, setSalvos] = useState(0);
  const [pending, startTransition] = useTransition();

  const feitas = itens.filter((i) => notas[i.a.id] !== undefined).length;
  const atual = idx !== null ? itens[idx] : null;

  function votar(nota: Nota) {
    if (idx === null || !atual) return;
    const id = atual.a.id;
    const anterior = notas[id];
    const novas = { ...notas, [id]: nota };
    setNotas(novas);
    setErro(null);
    // próxima sem nota; revisando (tudo já com nota), segue na ordem
    setIdx(proximaSemNota(idx, novas) ?? (idx + 1 < itens.length ? idx + 1 : null));
    const volta = idx;
    startTransition(async () => {
      const r = await avaliarAtracaoAction(id, nota);
      if (r.ok) {
        setSalvos((s) => s + 1);
        return;
      }
      // não salvou: desfaz e volta pra atração que falhou
      setNotas((n) => {
        const c = { ...n };
        if (anterior === undefined) delete c[id];
        else c[id] = anterior;
        return c;
      });
      setIdx(volta);
      setErro(r.erro ?? "não salvou — tenta de novo");
    });
  }

  const voltarHref = `/roteiro/atracoes?parque=${parque.code}`;

  return (
    <div className="flex flex-col gap-3.5 pt-[18px]">
      <div className="flex flex-col gap-2">
        <Link href={voltarHref} className="flex items-center gap-2.5 text-ink-faint">
          <ChevronLeftIcon width={20} height={20} strokeWidth={2} />
          <span className="text-[12px] font-extrabold tracking-[2px]">ATRAÇÕES</span>
        </Link>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-extrabold tracking-[3px]" style={{ color: parque.cor }}>
              DÁ SUA NOTA
            </span>
            <h1 className="font-display text-[26px] font-semibold leading-[1.1]">{parque.nome}</h1>
          </div>
          <span className="pb-1 text-[12px] font-bold text-ink-faint">
            {feitas} de {itens.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${itens.length ? (feitas / itens.length) * 100 : 0}%`, background: parque.cor }}
          />
        </div>
      </div>

      {erro && (
        <p className="rounded-[13px] border border-nucleo-gabi/50 bg-nucleo-gabi/[0.1] px-3.5 py-2.5 text-[12.5px] font-bold text-nucleo-gabi" role="alert">
          {erro}
        </p>
      )}

      {atual ? (
        <>
          <div
            key={atual.a.id}
            className="animate-rise flex flex-col overflow-hidden rounded-card-lg border border-stroke bg-surface"
          >
            <button
              type="button"
              onClick={() => setFolha(true)}
              aria-label={`Ver vídeo e detalhes de ${atual.a.nome}`}
              className="relative block w-full"
            >
              <FotoAtracao src={atual.foto} cor={parque.cor} alt={atual.a.nome} className="aspect-[2/1] w-full" />
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-[rgba(7,11,38,0.72)] px-3 py-1.5 text-[12px] font-extrabold text-ink backdrop-blur">
                <PlayIcon width={15} height={15} className="text-gold-light" />
                {atual.a.videoUrl ? "ver vídeo e detalhes" : "ver detalhes"}
              </span>
            </button>
            <div className="flex flex-col gap-2 p-4 pt-3.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-[2px] text-ink-faint">
                {[tipoLabel(atual.a.tipo), atual.a.area].filter(Boolean).join(" · ")}
              </span>
              <h2 className="font-display text-[22px] font-semibold leading-[1.15]">{atual.a.nome}</h2>
              {atual.a.descricao && (
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{atual.a.descricao}</p>
              )}
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-muted">
                <RulerIcon width={14} height={14} className="shrink-0 text-lavanda" />
                {resumoCriancas(atual.a.alturaMinCm, criancas)}
              </span>
              <Alertas alertas={atual.a.alertas} />
            </div>
          </div>

          <GradeNotas grande atual={notas[atual.a.id] ?? null} onEscolher={votar} />

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => idx !== null && idx > 0 && setIdx(idx - 1)}
              className="flex items-center gap-1 px-1 py-2 text-[12.5px] font-extrabold text-ink-faint disabled:opacity-30"
            >
              <ChevronLeftIcon width={15} height={15} strokeWidth={2} />
              anterior
            </button>
            <button
              type="button"
              onClick={() =>
                idx !== null && setIdx(idx + 1 < itens.length ? idx + 1 : proximaSemNota(idx, notas))
              }
              className="flex items-center gap-1 px-1 py-2 text-[12.5px] font-extrabold text-ink-faint"
            >
              pular por agora
              <ChevronRightIcon width={15} height={15} strokeWidth={2} />
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] font-semibold text-ink-faint">
            {pending ? (
              "salvando…"
            ) : (
              <>
                {salvos > 0 && <CheckIcon width={13} height={13} className="text-[#8fdca5]" />}
                cada toque já fica salvo — pode parar e continuar depois
              </>
            )}
          </p>

          <Folha aberta={folha} onFechar={fecharFolha} titulo={atual.a.nome} rotulo={parque.nome}>
            <DetalheAtracao a={atual.a} foto={atual.foto} cor={parque.cor} criancas={criancas} />
          </Folha>
        </>
      ) : (
        <div className="animate-rise flex flex-col items-center gap-3 rounded-card-lg border border-gold/40 bg-[linear-gradient(135deg,rgba(246,196,83,0.16),rgba(246,196,83,0.04))] px-5 py-7 text-center">
          <SparkleIcon width={30} height={30} className="text-gold-light" />
          <h2 className="font-display text-[22px] font-semibold leading-tight">{parque.nome} completo!</h2>
          <p className="text-[13px] text-ink-soft">
            Suas {itens.length} notas estão salvas. Dá pra trocar qualquer uma depois na sua lista.
          </p>
          {proximo ? (
            <Link
              href={`/roteiro/atracoes/classificar?parque=${proximo.code}`}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[14px] font-extrabold text-[#2a1c05]"
            >
              Próximo: {proximo.nome} ({proximo.faltam} sem nota)
              <ChevronRightIcon width={15} height={15} strokeWidth={2.2} />
            </Link>
          ) : (
            <span className="text-[13px] font-extrabold text-gold-light">Você deu nota em todas as atrações!</span>
          )}
          <Link
            href={`/roteiro/atracoes?parque=${parque.code}&ver=familia`}
            className="text-[13px] font-extrabold text-gold-light"
          >
            ver o ranking da família
          </Link>
          <button
            type="button"
            onClick={() => setIdx(0)}
            className="text-[12px] font-extrabold text-ink-faint underline underline-offset-2"
          >
            revisar minhas notas deste parque
          </button>
        </div>
      )}
    </div>
  );
}
