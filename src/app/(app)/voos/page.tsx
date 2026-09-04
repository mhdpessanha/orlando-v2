import CopyButton from "@/components/CopyButton";
import { PlaneIcon } from "@/components/icons";
import { diaMes } from "@/lib/format";
import { getVoosPorGrupo, GRUPO_VOO_LABEL } from "@/lib/queries";

export const metadata = { title: "Voos · Orlando 2027" };

const GRUPO_COR: Record<string, string> = {
  familia: "#f6c453",
  gabi: "#ff8a7a",
  vm: "#5fd0c5",
};

function StatusChip({ status }: { status: string | null }) {
  if (!status) return null;
  const emitido = /emitido|confirmado|feito/i.test(status);
  return (
    <span
      className={`rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold uppercase ${
        emitido
          ? "border-gold/45 bg-gold/[0.14] text-gold-light"
          : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
      }`}
    >
      {status}
    </span>
  );
}

export default async function VoosPage() {
  const grupos = await getVoosPorGrupo();

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Voos</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {grupos.length > 0
            ? "localizador na mão é embarque sem stress"
            : "os voos aparecem aqui após o sync da planilha"}
        </span>
      </div>

      {grupos.map(({ grupo, voos }) => (
        <section key={grupo} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-[3px] w-4 rounded-sm"
              style={{ background: GRUPO_COR[grupo] ?? "#b7a9e8" }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              {GRUPO_VOO_LABEL[grupo] ?? grupo}
            </span>
          </div>

          {voos.map((v) => (
            <div
              key={v.id}
              className="flex flex-col gap-3 rounded-card border border-stroke bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PlaneIcon width={17} height={17} className="text-lavanda" />
                  <span className="text-[15px] font-extrabold">
                    {v.trecho ?? [v.origem, v.destino].filter(Boolean).join(" → ") ?? "trecho a definir"}
                  </span>
                </div>
                <StatusChip status={v.status} />
              </div>

              <span className="text-[12.5px] font-semibold text-ink-muted">
                {[
                  v.data && diaMes(v.data),
                  v.voo,
                  v.saida && v.chegada
                    ? `${v.saida.replace(":", "h")} → ${v.chegada.replace(":", "h")}`
                    : v.saida && `saída ${v.saida.replace(":", "h")}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "detalhes ainda na planilha"}
              </span>

              {v.reserva && (
                <div className="flex items-center justify-between gap-3 rounded-[13px] border border-dashed border-gold/45 bg-gold/[0.06] px-3.5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">
                      LOCALIZADOR
                    </span>
                    <span className="font-display text-[22px] font-semibold tracking-[3px] text-gold-light">
                      {v.reserva}
                    </span>
                  </div>
                  <CopyButton texto={v.reserva} label={`Copiar localizador ${v.reserva}`} />
                </div>
              )}

              {v.notas && <span className="text-[12px] text-ink-muted">{v.notas}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
