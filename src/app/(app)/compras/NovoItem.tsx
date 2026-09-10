"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronRightIcon, PlusIcon } from "@/components/icons";
import CamposItem, { INPUT, type Pessoa } from "./CamposItem";
import { criarItemAction, type ItemState } from "./actions";

export default function NovoItem({ pessoas }: { pessoas: Pessoa[] }) {
  const [state, formAction, pending] = useActionState<ItemState, FormData>(criarItemAction, {});
  const [detalhes, setDetalhes] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // limpa o formulário quando salva
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDetalhes(false);
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-card-lg border border-gold/35 bg-[linear-gradient(135deg,rgba(246,196,83,0.12),rgba(246,196,83,0.03))] p-4"
    >
      <div className="flex gap-2">
        <input
          name="nome"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="O que você quer trazer?"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Adicionar"
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-deep text-[#2a1c05] transition-opacity active:scale-95 disabled:opacity-60"
        >
          <PlusIcon width={20} height={20} strokeWidth={2.4} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setDetalhes((v) => !v)}
        className="flex items-center gap-1 self-start text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink-faint"
      >
        <ChevronRightIcon
          width={12}
          height={12}
          strokeWidth={2.2}
          className={`transition-transform ${detalhes ? "rotate-90" : ""}`}
        />
        {detalhes ? "menos detalhes" : "onde, preço, pra quem…"}
      </button>

      <div className={detalhes ? "" : "hidden"}>
        <CamposItem pessoas={pessoas} semNome />
      </div>

      {state.error && (
        <p className="text-[12.5px] font-bold text-nucleo-gabi" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
