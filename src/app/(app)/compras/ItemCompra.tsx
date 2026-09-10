"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Folha } from "@/components/Detalhe";
import { CheckIcon, LockIcon, TrashIcon } from "@/components/icons";
import CamposItem, { type Pessoa } from "./CamposItem";
import { metaItem, type Item } from "./item";
import { alternarCompradoAction, atualizarItemAction, excluirItemAction, type ItemState } from "./actions";

// Card de um item MEU: toque abre a folha de edição; o check marca comprado.
export default function ItemCompra({ item, pessoas }: { item: Item; pessoas: Pessoa[] }) {
  const [aberta, setAberta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const fechar = useCallback(() => {
    setAberta(false);
    setConfirmando(false);
  }, []);
  const [state, formAction, pending] = useActionState<ItemState, FormData>(atualizarItemAction, {});

  useEffect(() => {
    if (state.ok) fechar();
  }, [state.ok, fechar]);

  const meta = metaItem(item);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAberta(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberta(true);
          }
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-card border border-stroke bg-surface px-4 py-3 transition-colors active:bg-white/[0.09] ${
          item.comprado ? "opacity-60" : ""
        }`}
      >
        <form action={alternarCompradoAction} onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label={item.comprado ? "Desmarcar comprado" : "Marcar como comprado"}
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 transition-colors active:scale-90 ${
              item.comprado
                ? "border-gold bg-gold text-night-deep"
                : "border-[rgba(255,255,255,0.28)] text-transparent"
            }`}
          >
            <CheckIcon width={14} height={14} strokeWidth={2.6} />
          </button>
        </form>
        <div className="flex min-w-0 grow flex-col gap-[1px]">
          <span
            className={`truncate text-[14px] font-extrabold ${item.comprado ? "line-through" : ""}`}
          >
            {item.nome}
          </span>
          {meta && <span className="truncate text-[12px] text-ink-muted">{meta}</span>}
        </div>
        {!item.publico && (
          <LockIcon width={15} height={15} className="shrink-0 text-ink-faint" aria-label="privado" />
        )}
      </div>

      <Folha aberta={aberta} onFechar={fechar} titulo={item.nome} rotulo="Editar item">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={item.id} />
          <CamposItem pessoas={pessoas} defaults={item} />
          {state.error && (
            <p className="text-[12.5px] font-bold text-nucleo-gabi" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[14px] font-extrabold text-[#2a1c05] transition-opacity disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </form>

        <form action={excluirItemAction} className="flex justify-center">
          <input type="hidden" name="id" value={item.id} />
          {confirmando ? (
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full border border-nucleo-gabi/60 bg-nucleo-gabi/[0.12] px-4 py-2 text-[12px] font-extrabold text-nucleo-gabi active:scale-95"
            >
              <TrashIcon width={14} height={14} />
              excluir mesmo?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-extrabold text-ink-faint"
            >
              <TrashIcon width={14} height={14} />
              excluir da lista
            </button>
          )}
        </form>
      </Folha>
    </>
  );
}
