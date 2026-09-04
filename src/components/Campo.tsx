import type { ReactNode } from "react";

// Blocos de conteúdo da folha de detalhe (server-safe, sem estado).

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
        {label}
      </span>
      <div className="text-[13.5px] font-semibold leading-relaxed text-ink">{children}</div>
    </div>
  );
}

// Grade 2 colunas pros pares curtos (data, voo, saída…)
export function Campos({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>;
}

// Texto longo da planilha: respeita quebras de linha da célula
export function Texto({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
        {label}
      </span>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

// Código pra copiar (localizador, bilhete, confirmação)
export function Codigo({
  label,
  valor,
  acao,
  grande,
}: {
  label: string;
  valor: string;
  acao: ReactNode;
  grande?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[13px] border border-dashed border-gold/45 bg-gold/[0.06] px-3.5 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">{label}</span>
        <span
          className={`break-all font-display font-semibold text-gold-light ${
            grande ? "text-[22px] tracking-[3px]" : "text-[16px] tracking-[1.5px]"
          }`}
        >
          {valor}
        </span>
      </div>
      {acao}
    </div>
  );
}
