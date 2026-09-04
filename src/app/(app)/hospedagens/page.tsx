import CopyButton from "@/components/CopyButton";
import { BedIcon } from "@/components/icons";
import { periodoEstadia } from "@/lib/format";
import { getEstadias } from "@/lib/queries";

export const metadata = { title: "Hospedagens · Orlando 2027" };

export default async function HospedagensPage() {
  const estadias = await getEstadias();

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Hospedagens</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {estadias.length > 0
            ? `${estadias.length} estadias, uma linha do tempo`
            : "as estadias aparecem aqui após o sync da planilha"}
        </span>
      </div>

      <div className="ml-1.5 flex flex-col gap-[18px] border-l-2 border-[rgba(255,255,255,0.13)] pl-5">
        {estadias.map((e) => {
          const confirmada = e.status && /confirmad|pago|feito/i.test(e.status);
          return (
            <div key={e.id} className="relative">
              <span
                className="absolute -left-[26px] top-[18px] h-2.5 w-2.5 rounded-full bg-gold"
                style={{ boxShadow: "0 0 10px rgba(246,196,83,0.7)" }}
              />
              <div className="flex flex-col gap-2.5 rounded-card border border-stroke bg-surface p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-gold/[0.12]">
                    <BedIcon width={20} height={20} className="text-gold" />
                  </div>
                  <div className="flex grow flex-col gap-0.5">
                    <span className="text-[14.5px] font-extrabold">{e.nome}</span>
                    <span className="text-[12px] text-ink-muted">
                      {[e.tipo, periodoEstadia(e.checkin, e.checkout)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {e.status && (
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold uppercase ${
                        confirmada
                          ? "border-gold/45 bg-gold/[0.14] text-gold-light"
                          : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
                      }`}
                    >
                      {e.status}
                    </span>
                  )}
                </div>

                {e.quem && <span className="text-[12px] font-bold text-ink-muted">{e.quem}</span>}

                {e.confirmacao && (
                  <div className="flex items-center justify-between gap-3 rounded-[13px] border border-dashed border-gold/45 bg-gold/[0.06] px-3.5 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">
                        CONFIRMAÇÃO
                      </span>
                      <span className="font-display text-[17px] font-semibold tracking-[2px] text-gold-light">
                        {e.confirmacao}
                      </span>
                    </div>
                    <CopyButton texto={e.confirmacao} label={`Copiar confirmação ${e.confirmacao}`} />
                  </div>
                )}

                {e.notas && <span className="text-[12px] text-ink-muted">{e.notas}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
