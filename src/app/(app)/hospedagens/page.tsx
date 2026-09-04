import { Campo, Campos, Codigo, Texto } from "@/components/Campo";
import CopyButton from "@/components/CopyButton";
import { CardExpansivel } from "@/components/Detalhe";
import { BedIcon, MapPinIcon } from "@/components/icons";
import { diaMes, diaSemanaCurto, parseISO, periodoEstadia } from "@/lib/format";
import { getEstadias } from "@/lib/queries";

export const metadata = { title: "Hospedagens · Orlando 2027" };

type Estadia = Awaited<ReturnType<typeof getEstadias>>[number];

function noites(checkin: string | null, checkout: string | null): number | null {
  if (!checkin || !checkout) return null;
  return Math.round((parseISO(checkout).getTime() - parseISO(checkin).getTime()) / 86_400_000);
}

function StatusChip({ status }: { status: string | null }) {
  if (!status) return null;
  const confirmada = /confirmad|pago|feito/i.test(status);
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold uppercase ${
        confirmada
          ? "border-gold/45 bg-gold/[0.14] text-gold-light"
          : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
      }`}
    >
      {status}
    </span>
  );
}

function DetalheEstadia({ e }: { e: Estadia }) {
  const n = noites(e.checkin, e.checkout);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-ink-muted">
          {[e.tipo, n && `${n} ${n === 1 ? "noite" : "noites"}`].filter(Boolean).join(" · ")}
        </span>
        <StatusChip status={e.status} />
      </div>

      {(e.checkin || e.checkout) && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Check-in", data: e.checkin },
            { label: "Check-out", data: e.checkout },
          ].map(({ label, data }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5"
            >
              <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                {label}
              </span>
              <span className="font-display text-[18px] font-semibold leading-tight">
                {data ? diaMes(data) : "—"}
              </span>
              {data && (
                <span className="text-[11px] font-bold text-ink-muted">{diaSemanaCurto(data)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Campos>{e.quem && <Campo label="Quem fica">{e.quem}</Campo>}</Campos>

      {e.confirmacao && (
        <Codigo
          label="CONFIRMAÇÃO"
          valor={e.confirmacao}
          acao={<CopyButton texto={e.confirmacao} label={`Copiar confirmação ${e.confirmacao}`} />}
        />
      )}

      {e.endereco && (
        <div className="flex items-start gap-3 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
          <MapPinIcon width={18} height={18} className="mt-0.5 shrink-0 text-lavanda" />
          <div className="flex min-w-0 grow flex-col gap-1.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              Endereço
            </span>
            <span className="text-[13px] leading-relaxed text-ink-soft">{e.endereco}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.endereco)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11.5px] font-extrabold text-gold-light underline underline-offset-2"
            >
              abrir no mapa
            </a>
          </div>
          <CopyButton texto={e.endereco} label="Copiar endereço" />
        </div>
      )}

      {e.notas && <Texto label="Notas">{e.notas}</Texto>}
      {e.detalhes && <Texto label="Detalhes">{e.detalhes}</Texto>}
    </>
  );
}

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
        {estadias.map((e) => (
          <div key={e.id} className="relative">
            <span
              className="absolute -left-[26px] top-[18px] h-2.5 w-2.5 rounded-full bg-gold"
              style={{ boxShadow: "0 0 10px rgba(246,196,83,0.7)" }}
            />
            <CardExpansivel
              titulo={e.nome}
              rotulo="Hospedagem"
              className="flex flex-col gap-2.5 rounded-card border border-stroke bg-surface p-4"
              detalhe={<DetalheEstadia e={e} />}
            >
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
                <StatusChip status={e.status} />
              </div>

              {e.quem && <span className="text-[12px] font-bold text-ink-muted">{e.quem}</span>}

              {e.confirmacao && (
                <Codigo
                  label="CONFIRMAÇÃO"
                  valor={e.confirmacao}
                  acao={<CopyButton texto={e.confirmacao} label={`Copiar confirmação ${e.confirmacao}`} />}
                />
              )}

              {e.notas && <span className="line-clamp-2 text-[12px] text-ink-muted">{e.notas}</span>}
            </CardExpansivel>
          </div>
        ))}
      </div>
    </div>
  );
}
