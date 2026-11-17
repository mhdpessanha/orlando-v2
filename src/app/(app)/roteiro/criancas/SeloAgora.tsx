"use client";

import { useEffect, useState } from "react";
import { agoraOrlando } from "@/lib/format";

// Durante a viagem, marca o item do horário atual (relógio de Orlando).
export default function SeloAgora({ data, inicio, fim }: { data: string; inicio: string; fim: string | null }) {
  const [agora, setAgora] = useState(false);
  useEffect(() => {
    const conferir = () => {
      const o = agoraOrlando();
      const hora = (h: string) => h.padStart(5, "0");
      setAgora(o.data === data && o.hora >= hora(inicio) && (fim === null || o.hora < hora(fim)));
    };
    conferir();
    const t = setInterval(conferir, 30_000);
    return () => clearInterval(t);
  }, [data, inicio, fim]);

  if (!agora) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-gold px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[1.5px] text-night-deep">
      <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-night-deep" />
      agora
    </span>
  );
}
