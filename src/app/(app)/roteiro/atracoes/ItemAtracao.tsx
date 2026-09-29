"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Folha } from "@/components/Detalhe";

// Card de atração: toque abre a folha (vídeo, detalhes, minha nota). O conteúdo
// da folha vem pronto do server; a nota salva e fecha a folha sozinha.
export default function ItemAtracao({
  titulo,
  rotulo,
  className,
  children,
  detalhe,
}: {
  titulo: string;
  rotulo?: string;
  className?: string;
  children: ReactNode;
  detalhe: ReactNode;
}) {
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
        className={`cursor-pointer transition-colors active:bg-white/[0.09] ${className ?? ""}`}
      >
        {children}
      </div>
      <Folha aberta={aberta} onFechar={fechar} titulo={titulo} rotulo={rotulo}>
        {detalhe}
      </Folha>
    </>
  );
}
