import Link from "next/link";
import { notFound } from "next/navigation";
import { BedIcon, CakeIcon, ChevronLeftIcon } from "@/components/icons";
import { avatarVariant } from "@/lib/avatars";
import { aniversarioAno, mesmoDiaMes, parseISO, periodoEstadia, tituloDia } from "@/lib/format";
import { hexRgba, PARQUE_INFO, PERIODO_INFO } from "@/lib/parques";
import { getDiaDetalhe, indicePorNucleo, pessoasDoDia } from "@/lib/queries";

export const metadata = { title: "Roteiro · Orlando 2027" };

export default async function DiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalhe = await getDiaDetalhe(id);
  if (!detalhe) notFound();
  const { dia, agenda, estadia, numeroDoDia, pessoas } = detalhe;

  const parque = dia.parqueCode ? PARQUE_INFO[dia.parqueCode] : null;
  const aniversariantes = pessoas.filter(
    (p) => p.aniversario && mesmoDiaMes(p.aniversario, dia.data),
  );
  const quemVai = pessoasDoDia(dia.quem, pessoas);
  const indices = indicePorNucleo(pessoas);

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-2.5">
        <Link href="/roteiro" className="flex items-center gap-2.5 text-ink-faint">
          <ChevronLeftIcon width={20} height={20} strokeWidth={2} />
          <span className="text-[12px] font-extrabold tracking-[2px]">ROTEIRO</span>
        </Link>
        <div className="flex items-end justify-between">
          <h1 className="font-display text-[27px] font-semibold leading-[1.1]">
            {tituloDia(dia.data)}
          </h1>
          <span className="pb-1 text-[12px] font-bold text-ink-faint">dia {numeroDoDia}</span>
        </div>
      </div>

      {aniversariantes.map((p) => {
        const ano = aniversarioAno(p.aniversario!);
        const idade = ano ? parseISO(dia.data).getUTCFullYear() - ano : null;
        const lugar = parque ? `no ${parque.nome}` : "em Orlando";
        return (
          <div
            key={p.id}
            className="flex items-center gap-3.5 rounded-card border border-gold/50 bg-[linear-gradient(135deg,rgba(246,196,83,0.2),rgba(246,196,83,0.06))] px-4 py-[15px]"
          >
            <CakeIcon width={26} height={26} className="shrink-0 text-gold-light" />
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-[16px] font-semibold text-gold-light">
                Hoje é aniversário {p.nome === "Joana" ? "da" : "de"} {p.nome}
              </span>
              <span className="text-[12.5px] text-ink-soft">
                {idade ? `${idade} anos, comemorados ${lugar}.` : `comemorado ${lugar}.`}
              </span>
            </div>
          </div>
        );
      })}

      {parque && (
        <div
          className="flex flex-col gap-3 rounded-card-lg border p-[18px]"
          style={{
            borderColor: hexRgba(parque.cor, 0.38),
            background: `linear-gradient(135deg, ${hexRgba(parque.cor, 0.16)}, rgba(255,255,255,0.04))`,
          }}
        >
          <span
            className="text-[10px] font-extrabold tracking-[3px]"
            style={{ color: parque.cor }}
          >
            PARQUE DO DIA
          </span>
          <span className="font-display text-[36px] font-semibold leading-none">
            {parque.nome}
          </span>
          {(dia.earlyEntry || dia.destaque) && (
            <div className="flex flex-wrap gap-2">
              {dia.earlyEntry && (
                <span className="rounded-full border border-[rgba(255,255,255,0.15)] bg-white/[0.07] px-3 py-[7px] text-[12px] font-bold text-ink-soft">
                  {/^sim$/i.test(dia.earlyEntry) ? "Early Entry" : `Early Entry ${dia.earlyEntry}`}
                </span>
              )}
              {dia.destaque && (
                <span className="rounded-full border border-gold/45 bg-gold/[0.14] px-3 py-[7px] text-[12px] font-extrabold text-gold-light">
                  {dia.destaque}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!parque && dia.destaque && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-gold/45 bg-gold/[0.14] px-3 py-[7px] text-[12px] font-extrabold text-gold-light">
            {dia.destaque}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Quem vai
        </span>
        <div className="flex items-center gap-3">
          {quemVai.length > 0 && (
            <div className="flex">
              {quemVai.map((p, i) => {
                const v = avatarVariant(p.nucleo, indices.get(p.id) ?? 0);
                return (
                  <div
                    key={p.id}
                    title={p.nome}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-night-mid text-[11px] font-extrabold ${i > 0 ? "-ml-[9px]" : ""}`}
                    style={{ background: v.bg, color: v.text }}
                  >
                    {p.iniciais ?? p.nome.charAt(0)}
                  </div>
                );
              })}
            </div>
          )}
          <span className="text-[12.5px] font-bold text-ink-muted">
            {dia.quem ?? "todo mundo junto"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          O dia
        </span>
        {agenda.length === 0 ? (
          <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
            A agenda deste dia ainda está sendo escrita na planilha.
          </div>
        ) : (
          <div className="ml-1.5 flex flex-col gap-[18px] border-l-2 border-[rgba(255,255,255,0.13)] pl-5">
            {agenda.map((item) => {
              const p = PERIODO_INFO[item.periodo] ?? PERIODO_INFO.manha;
              return (
                <div key={item.id} className="relative flex flex-col gap-[3px]">
                  <span
                    className="absolute -left-[26px] top-[5px] h-2.5 w-2.5 rounded-full"
                    style={{ background: p.cor, boxShadow: `0 0 10px ${hexRgba(p.cor, 0.7)}` }}
                  />
                  <span
                    className="text-[10px] font-extrabold tracking-[2px]"
                    style={{ color: p.cor }}
                  >
                    {p.label}
                  </span>
                  <span className="text-[14.5px] font-extrabold">{item.titulo}</span>
                  {(item.local || item.detalhe) && (
                    <span className="text-[12px] text-ink-muted">
                      {[item.local, item.detalhe].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {item.chip && (
                    <span className="mt-[3px] self-start rounded-full border border-[rgba(255,255,255,0.14)] bg-white/[0.06] px-[9px] py-1 text-[10.5px] font-extrabold text-[#b7b5d6]">
                      {item.chip}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dia.hospedagemNoite && (
        <div className="flex items-center gap-3.5 rounded-card border border-stroke bg-surface px-4 py-[15px]">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-gold/[0.12]">
            <BedIcon width={20} height={20} className="text-gold" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-extrabold">Dormimos no {dia.hospedagemNoite}</span>
            <span className="text-[12px] text-ink-muted">
              {[estadia?.tipo, periodoEstadia(estadia?.checkin ?? null, estadia?.checkout ?? null)]
                .filter(Boolean)
                .join(" · ") || "detalhes em Hospedagens"}
            </span>
          </div>
        </div>
      )}

      {dia.notas && <p className="text-[12.5px] leading-relaxed text-ink-muted">{dia.notas}</p>}
    </div>
  );
}
