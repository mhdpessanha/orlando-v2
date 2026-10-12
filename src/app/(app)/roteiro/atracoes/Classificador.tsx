"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import type { Attraction } from "@prisma/client";
import { Folha } from "@/components/Detalhe";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, RulerIcon, SparkleIcon } from "@/components/icons";
import { resumoCriancas, tipoLabel, type Crianca, type Nota } from "@/lib/atracoes";
import { hexRgba } from "@/lib/parques";
import { avaliarAtracaoAction } from "./actions";
import { GradeNotas } from "./BotoesNota";
import DetalheAtracao, { Alertas } from "./DetalheAtracao";
import FotoAtracao from "./FotoAtracao";
import TrilhaParques from "./TrilhaParques";

type Parque = { code: string; nome: string; cor: string; minhas: number; total: number };

type Props = {
  parque: string; // code do parque aberto
  parques: Parque[]; // todos, na ordem do roteiro (contagem do servidor)
  itens: { a: Attraction; foto: string | null }[];
  notasIniciais: Record<string, number>;
  criancas: Crianca[];
};

const hrefClassificar = (code: string) => `/roteiro/atracoes/classificar?parque=${code}`;

// Modo rápido: uma atração por vez, 4 botões grandes. Cada toque salva no
// servidor e pula pra próxima sem nota. A trilha no topo mostra todos os
// parques e troca de parque a qualquer momento.
export default function Classificador({ parque, parques, itens, notasIniciais, criancas }: Props) {
  const [notas, setNotas] = useState<Record<string, number>>(notasIniciais);
  // puladas nesta visita: não voltam no giro até a pessoa pedir
  const [pulados, setPulados] = useState<Set<string>>(() => new Set());
  // revisando = passa por todas em ordem, com ou sem nota
  const [revisando, setRevisando] = useState(false);
  const proximaSemNota = useCallback(
    (depoisDe: number, n: Record<string, number>, pul: Set<string>): number | null => {
      for (let k = 1; k <= itens.length; k++) {
        const j = (depoisDe + k) % itens.length;
        if (n[itens[j].a.id] === undefined && !pul.has(itens[j].a.id)) return j;
      }
      return null;
    },
    [itens],
  );
  // começa na primeira sem nota; null = fim do parque
  const [idx, setIdx] = useState<number | null>(() => proximaSemNota(-1, notasIniciais, new Set()));
  const [folha, setFolha] = useState(false);
  const fecharFolha = useCallback(() => setFolha(false), []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvos, setSalvos] = useState(0);
  const [pending, startTransition] = useTransition();

  const feitas = itens.filter((i) => notas[i.a.id] !== undefined).length;
  const faltam = itens.length - feitas;
  const atual = idx !== null ? itens[idx] : null;

  // parque aberto com a contagem ao vivo; os outros como vieram do servidor
  const vivos = parques.map((p) => (p.code === parque ? { ...p, minhas: feitas } : p));
  const pos = vivos.findIndex((p) => p.code === parque);
  const info = vivos[pos];
  const totalGeral = vivos.reduce((s, p) => s + p.total, 0);
  const minhasGeral = vivos.reduce((s, p) => s + p.minhas, 0);
  const completos = vivos.filter((p) => p.minhas >= p.total).length;
  const outrosPendentes = [...vivos.slice(pos + 1), ...vivos.slice(0, pos)].filter((p) => p.minhas < p.total);
  const proximo = outrosPendentes[0] ?? null;

  function irPara(i: number | null) {
    setIdx(i);
    if (i === null) setRevisando(false);
  }

  const seguinte = (i: number) => (i + 1 < itens.length ? i + 1 : null);

  function votar(nota: Nota) {
    if (idx === null || !atual) return;
    const id = atual.a.id;
    const anterior = notas[id];
    const novas = { ...notas, [id]: nota };
    setNotas(novas);
    setErro(null);
    irPara(revisando ? seguinte(idx) : proximaSemNota(idx, novas, pulados));
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

  function pular() {
    if (idx === null || !atual) return;
    if (revisando) return irPara(seguinte(idx));
    const pul = notas[atual.a.id] === undefined ? new Set(pulados).add(atual.a.id) : pulados;
    setPulados(pul);
    irPara(proximaSemNota(idx, notas, pul));
  }

  function voltarNasPuladas() {
    const vazio = new Set<string>();
    setPulados(vazio);
    setRevisando(false);
    setIdx(proximaSemNota(-1, notas, vazio));
  }

  function revisar() {
    setRevisando(true);
    setIdx(0);
  }

  return (
    <div className="flex flex-col gap-3.5 pt-[18px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/roteiro/atracoes?parque=${parque}`} className="flex items-center gap-2.5 text-ink-faint">
            <ChevronLeftIcon width={20} height={20} strokeWidth={2} />
            <span className="text-[12px] font-extrabold tracking-[2px]">ATRAÇÕES</span>
          </Link>
          <span className="text-[11.5px] font-bold text-ink-faint">
            {minhasGeral} de {totalGeral} no total
          </span>
        </div>
        <TrilhaParques parques={vivos} ativo={parque} href={hrefClassificar} />
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display text-[24px] font-semibold leading-[1.1]">{info.nome}</h1>
            <span className="shrink-0 pb-0.5 text-[12px] font-bold text-ink-faint">
              {feitas} de {itens.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${itens.length ? (feitas / itens.length) * 100 : 0}%`, background: info.cor }}
            />
          </div>
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
              <FotoAtracao src={atual.foto} cor={info.cor} alt={atual.a.nome} className="aspect-[5/2] w-full" />
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
              onClick={pular}
              className="flex items-center gap-1 px-1 py-2 text-[12.5px] font-extrabold text-ink-faint"
            >
              {notas[atual.a.id] === undefined ? "pular por agora" : "próxima"}
              <ChevronRightIcon width={15} height={15} strokeWidth={2} />
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] font-semibold text-ink-faint">
            {pending ? (
              "salvando…"
            ) : (
              <>
                {salvos > 0 && <CheckIcon width={13} height={13} className="shrink-0 text-[#8fdca5]" />}
                cada toque já fica salvo — dá pra trocar de parque e voltar quando quiser
              </>
            )}
          </p>

          <Folha aberta={folha} onFechar={fecharFolha} titulo={atual.a.nome} rotulo={info.nome}>
            <DetalheAtracao a={atual.a} foto={atual.foto} cor={info.cor} criancas={criancas} />
          </Folha>
        </>
      ) : (
        <FimDoParque
          parque={info}
          faltam={faltam}
          tudo={minhasGeral >= totalGeral}
          completos={completos}
          nParques={vivos.length}
          faltamGeral={totalGeral - minhasGeral}
          totalGeral={totalGeral}
          proximo={proximo}
          outros={outrosPendentes.slice(1)}
          onVoltarNasPuladas={voltarNasPuladas}
          onRevisar={revisar}
        />
      )}
    </div>
  );
}

// Fim de um parque não é fim da tarefa: puxa pro próximo e lista o que falta.
function FimDoParque({
  parque,
  faltam,
  tudo,
  completos,
  nParques,
  faltamGeral,
  totalGeral,
  proximo,
  outros,
  onVoltarNasPuladas,
  onRevisar,
}: {
  parque: Parque;
  faltam: number; // sem nota neste parque (= as que a pessoa pulou)
  tudo: boolean;
  completos: number;
  nParques: number;
  faltamGeral: number;
  totalGeral: number;
  proximo: Parque | null;
  outros: Parque[];
  onVoltarNasPuladas: () => void;
  onRevisar: () => void;
}) {
  const completo = faltam === 0;
  const voltarLabel = faltam === 1 ? "Voltar na que pulei" : `Voltar nas ${faltam} que pulei`;

  return (
    <div className="animate-rise flex flex-col items-center gap-3 rounded-card-lg border border-gold/40 bg-[linear-gradient(135deg,rgba(246,196,83,0.16),rgba(246,196,83,0.04))] px-5 py-6 text-center">
      {tudo ? (
        <SparkleIcon width={30} height={30} className="text-gold-light" />
      ) : (
        <span
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
          style={completo ? { background: parque.cor } : { border: `2px solid ${hexRgba(parque.cor, 0.6)}` }}
        >
          {completo ? (
            <CheckIcon width={20} height={20} strokeWidth={2.6} className="text-night-deep" />
          ) : (
            <span className="text-[12px] font-extrabold" style={{ color: parque.cor }}>
              {parque.minhas}/{parque.total}
            </span>
          )}
        </span>
      )}

      <h2 className="font-display text-[22px] font-semibold leading-tight">
        {tudo ? "Você deu nota em tudo!" : completo ? `${parque.nome} pronto!` : `Fim do ${parque.nome} por agora`}
      </h2>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        {tudo
          ? `Suas notas nas ${totalGeral} atrações dos ${nParques} parques estão salvas. Dá pra trocar qualquer uma depois.`
          : completo
            ? `${completos} de ${nParques} parques prontos — ainda faltam ${faltamGeral} atrações nos outros.`
            : `${faltam === 1 ? "Ficou 1 sem nota" : `Ficaram ${faltam} sem nota`} porque você pulou. Dá pra voltar agora ou depois — o resto já está salvo.`}
      </p>

      {proximo && (
        <Link
          href={hrefClassificar(proximo.code)}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[#2a1c05]"
        >
          <span className="flex flex-col items-center">
            <span className="text-[14px] font-extrabold">Próximo: {proximo.nome}</span>
            <span className="text-[11.5px] font-bold opacity-75">
              {proximo.total - proximo.minhas === 1 ? "1 sem nota" : `${proximo.total - proximo.minhas} sem nota`}
            </span>
          </span>
          <ChevronRightIcon width={16} height={16} strokeWidth={2.2} className="shrink-0" />
        </Link>
      )}

      {!completo && (
        <button
          type="button"
          onClick={onVoltarNasPuladas}
          className={
            proximo
              ? "w-full rounded-xl border border-gold/50 bg-gold/[0.08] px-4 py-2.5 text-[13.5px] font-extrabold text-gold-light"
              : "mt-1 w-full rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[14px] font-extrabold text-[#2a1c05]"
          }
        >
          {voltarLabel}
        </button>
      )}

      {outros.length > 0 && (
        <div className="mt-1 flex w-full flex-col text-left">
          <span className="pb-1 text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Também faltam
          </span>
          {outros.map((p) => (
            <Link
              key={p.code}
              href={hrefClassificar(p.code)}
              className="flex items-center gap-2.5 border-t border-white/[0.08] py-2.5"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.cor }} />
              <span className="grow truncate text-[13.5px] font-extrabold">{p.nome}</span>
              <span className="shrink-0 text-[11.5px] font-bold text-ink-faint">
                {p.total - p.minhas} sem nota
              </span>
              <ChevronRightIcon width={14} height={14} className="shrink-0 text-ink-faint" />
            </Link>
          ))}
        </div>
      )}

      <Link
        href={`/roteiro/atracoes?parque=${parque.code}&ver=familia`}
        className="mt-1 text-[13px] font-extrabold text-gold-light"
      >
        ver o ranking da família
      </Link>
      <button
        type="button"
        onClick={onRevisar}
        className="text-[12px] font-extrabold text-ink-faint underline underline-offset-2"
      >
        revisar minhas notas deste parque
      </button>
    </div>
  );
}
