import type { CSSProperties } from "react";
import type { AvatarInfo } from "@/lib/caricaturas";

// Rosto da pessoa (caricatura) sobre a cor do núcleo; sem caricatura, a inicial.
export default function Avatar({
  a,
  size,
  className,
  style,
}: {
  a: AvatarInfo;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      title={a.nome}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: a.bg,
        color: a.text,
        fontSize: Math.max(8, Math.round(size * 0.36)),
        ...style,
      }}
    >
      {a.foto ? (
        <img src={a.foto} alt={a.nome} decoding="async" className="h-full w-full object-cover" />
      ) : (
        a.iniciais
      )}
    </span>
  );
}
