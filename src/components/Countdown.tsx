"use client";

import { useEffect, useState } from "react";

// 07/01/2027 às 21h05 de Brasília (UTC-3, sem horário de verão)
const EMBARQUE_MS = Date.UTC(2027, 0, 8, 0, 5, 0);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Countdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, EMBARQUE_MS - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] font-extrabold tracking-[5px] text-lavanda">FALTAM</span>
      <span
        suppressHydrationWarning
        className="font-display text-[108px] font-bold leading-none text-gold-light [text-shadow:0_0_38px_rgba(246,196,83,0.5)]"
      >
        {days}
      </span>
      <span className="text-[15px] font-semibold text-ink-soft">
        {days === 1 ? "dia para o embarque" : "dias para o embarque"}
      </span>
      <span
        suppressHydrationWarning
        className="h-5 text-[13px] font-bold tabular-nums text-ink-muted"
      >
        {diff === 0
          ? "é hoje — boa viagem!"
          : `e ${pad(hours)}h ${pad(minutes)}min ${pad(seconds)}s`}
      </span>
    </div>
  );
}
