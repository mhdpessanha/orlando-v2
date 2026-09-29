"use client";

import { useState } from "react";
import { SparkleIcon } from "@/components/icons";
import { hexRgba } from "@/lib/parques";

// Foto da atração com fundo na cor do parque: se não houver foto (ou falhar),
// fica o fundo com um brilho no meio.
export default function FotoAtracao({
  src,
  cor,
  alt,
  className,
}: {
  src: string | null;
  cor: string;
  alt: string;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className ?? ""}`}
      style={{ background: `linear-gradient(135deg, ${hexRgba(cor, 0.4)}, rgba(255,255,255,0.05))` }}
    >
      <SparkleIcon className="absolute inset-0 m-auto h-1/3 max-h-10 w-1/3 max-w-10 text-white/30" />
      {src && !falhou && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFalhou(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
