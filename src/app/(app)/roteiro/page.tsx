import Link from "next/link";
import { diaNumero, diaSemanaCurto } from "@/lib/format";
import { hexRgba, PARQUE_INFO } from "@/lib/parques";
import { getDias, TRIP_FIM, TRIP_INICIO } from "@/lib/queries";

export const metadata = { title: "Roteiro · Orlando 2027" };

export default async function RoteiroPage() {
  const dias = await getDias();

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Roteiro</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {dias.length > 0
            ? `${dias.length} dias · ${TRIP_INICIO.slice(8)} a ${TRIP_FIM.slice(8)} de janeiro`
            : "os dias aparecem aqui após o sync da planilha"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {dias.map((d) => {
          const parque = d.parqueCode ? PARQUE_INFO[d.parqueCode] : null;
          return (
            <Link
              key={d.id}
              href={`/roteiro/${d.id}`}
              className="flex items-center gap-[13px] rounded-card border border-stroke bg-surface px-3.5 py-3"
            >
              <div className="flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[13px] border border-stroke bg-white/[0.04]">
                <span className="font-display text-[17px] font-semibold leading-none">
                  {diaNumero(d.data)}
                </span>
                <span className="text-[9.5px] font-bold text-ink-faint">
                  {diaSemanaCurto(d.data)}
                </span>
              </div>
              <div className="flex grow flex-col gap-[1px]">
                <span className="text-[14px] font-extrabold">{d.titulo}</span>
                <span className="text-[12px] text-ink-muted">
                  {[d.quem, d.hospedagemNoite].filter(Boolean).join(" · ")}
                </span>
              </div>
              {parque && (
                <span
                  className="shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold"
                  style={{
                    color: parque.cor,
                    borderColor: hexRgba(parque.cor, 0.45),
                    background: hexRgba(parque.cor, 0.13),
                  }}
                >
                  {d.parqueCode}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
