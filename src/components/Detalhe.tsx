"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRightIcon, CloseIcon, InfoIcon } from "./icons";

// Folha de detalhe: sobe por cima da tela com o "card maior" de um item.
// Conteúdo é renderizado no server e passado como children — aqui só
// mora o abre/fecha. Portal no body pra fugir do transform do animate-rise.

type FolhaProps = {
  aberta: boolean;
  onFechar: () => void;
  titulo: string;
  rotulo?: string;
  children: ReactNode;
};

function Folha({ aberta, onFechar, titulo, rotulo, children }: FolhaProps) {
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", onKey);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAntes;
    };
  }, [aberta, onFechar]);

  if (!aberta || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(7,11,38,0.72)] backdrop-blur-[3px]"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[26px] border border-b-0 border-[rgba(255,255,255,0.16)] bg-[#141a48] shadow-[0_-18px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex items-start justify-between gap-3 px-[22px] pb-3 pt-1">
          <div className="flex min-w-0 flex-col gap-1">
            {rotulo && (
              <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-gold">
                {rotulo}
              </span>
            )}
            <h2 className="font-display text-[22px] font-semibold leading-[1.15]">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white/[0.06] text-ink-muted active:scale-95"
          >
            <CloseIcon width={17} height={17} strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-[22px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type CardExpansivelProps = {
  titulo: string;
  rotulo?: string;
  className?: string;
  children: ReactNode; // resumo (o card como aparece na lista)
  detalhe: ReactNode; // conteúdo da folha
};

// O card inteiro é o gatilho. Botões dentro dele (copiar) fazem stopPropagation.
export function CardExpansivel({ titulo, rotulo, className, children, detalhe }: CardExpansivelProps) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);

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
        className={`relative cursor-pointer transition-colors active:bg-white/[0.09] ${className ?? ""}`}
      >
        {children}
        <span className="mt-1 flex items-center justify-end gap-1 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-ink-faint">
          detalhes
          <ChevronRightIcon width={12} height={12} strokeWidth={2.2} />
        </span>
      </div>
      <Folha aberta={aberta} onFechar={fechar} titulo={titulo} rotulo={rotulo}>
        {detalhe}
      </Folha>
    </>
  );
}

type TituloExpansivelProps = {
  titulo: string;
  rotulo?: string;
  className?: string;
  children: ReactNode; // o texto do título
  detalhe: ReactNode;
};

// Só o título é gatilho (pra cards que já têm botões próprios, como votação).
export function TituloExpansivel({ titulo, rotulo, className, children, detalhe }: TituloExpansivelProps) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={`flex items-start gap-2 text-left ${className ?? ""}`}
      >
        <span>{children}</span>
        <InfoIcon width={15} height={15} className="mt-[3px] shrink-0 text-lavanda" />
      </button>
      <Folha aberta={aberta} onFechar={fechar} titulo={titulo} rotulo={rotulo}>
        {detalhe}
      </Folha>
    </>
  );
}
