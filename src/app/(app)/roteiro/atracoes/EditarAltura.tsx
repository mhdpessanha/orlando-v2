"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RulerIcon } from "@/components/icons";
import { ALTURA_MAX_CM, ALTURA_MIN_CM, alturaM } from "@/lib/atracoes";
import { salvarAlturaAction } from "./actions";

// Altura da criança: vem da planilha (Turma, altura_cm); os pais podem colocar ou
// corrigir aqui — salva na planilha e a lista se refaz pela altura nova.
export default function EditarAltura({
  crianca,
  podeEditar,
}: {
  crianca: { id: string; nome: string; alturaCm: number | null };
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(crianca.alturaCm?.toString() ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const cm = Number(valor.replace(",", "."));
    // aceita "1,04" (metros) além de "104"
    const emCm = cm > 0 && cm < 3 ? Math.round(cm * 100) : Math.round(cm);
    if (!Number.isFinite(emCm) || emCm < ALTURA_MIN_CM || emCm > ALTURA_MAX_CM) {
      setErro(`em centímetros, entre ${ALTURA_MIN_CM} e ${ALTURA_MAX_CM}`);
      return;
    }
    setErro(null);
    startTransition(async () => {
      const r = await salvarAlturaAction(crianca.id, emCm);
      if (!r.ok) {
        setErro(r.erro ?? "não salvou — tenta de novo");
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  if (editando) {
    return (
      <form onSubmit={salvar} className="flex flex-col gap-2">
        <label className="text-[11.5px] font-bold text-ink-muted" htmlFor={`altura-${crianca.id}`}>
          Altura de {crianca.nome}, de tênis (os parques medem de tênis)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex grow items-center rounded-[13px] border border-stroke bg-white/[0.06] pr-3 focus-within:border-gold/60">
            <input
              id={`altura-${crianca.id}`}
              type="text"
              inputMode="numeric"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="ex.: 104"
              className="w-full min-w-0 bg-transparent px-3 py-2.5 text-[16px] font-bold text-ink outline-none placeholder:text-ink-faint"
            />
            <span className="text-[13px] font-bold text-ink-faint">cm</span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-[13px] bg-gradient-to-br from-gold to-gold-deep px-4 py-2.5 text-[13.5px] font-extrabold text-[#2a1c05] disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {erro && (
          <p className="text-[12px] font-bold text-nucleo-gabi" role="alert">
            {erro}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setEditando(false);
            setErro(null);
            setValor(crianca.alturaCm?.toString() ?? "");
          }}
          className="self-start text-[12px] font-extrabold text-ink-faint underline underline-offset-2"
        >
          cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <RulerIcon width={15} height={15} className="shrink-0 text-lavanda" />
      <span className="grow text-[13px] font-bold text-ink-soft">
        {crianca.alturaCm !== null ? alturaM(crianca.alturaCm) : "falta a altura"}
      </span>
      {podeEditar && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-extrabold ${
            crianca.alturaCm === null
              ? "border-gold/50 bg-gold/[0.12] text-gold-light"
              : "border-stroke bg-white/[0.05] text-ink-muted"
          }`}
        >
          {crianca.alturaCm === null ? "colocar a altura" : "corrigir"}
        </button>
      )}
    </div>
  );
}
