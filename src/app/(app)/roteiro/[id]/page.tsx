import Link from "next/link";
import { notFound } from "next/navigation";
import { BedIcon, CakeIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { precisaTroca, trocaLabel } from "@/lib/atracoes";
import { avatarVariant } from "@/lib/avatars";
import { aniversarioAno, mesmoDiaMes, parseISO, periodoEstadia, tituloDia } from "@/lib/format";
import { hexRgba, PARQUE_INFO, PERIODO_INFO } from "@/lib/parques";
import { getAtracoes, getDiaDetalhe, indicePorNucleo, pessoasDoDia, rankingFamilia } from "@/lib/queries";

export const metadata = { title: "Roteiro · Orlando 2027" };

export default async function DiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalhe = await getDiaDetalhe(id);
  if (!detalhe) notFound();
  const { dia, agenda, estadias, numeroDoDia, pessoas } = detalhe;
  const session = await getSession();
  const atracoes =
    dia.parqueCode && session ? await getAtracoes(session.userId, dia.parqueCode) : null;
  const doParque = atracoes?.parque?.code === dia.parqueCode ? atracoes : null;
  const imperdiveis = doParque
    ? rankingFamilia(doParque.itens)
        .filter((i) => i.media !== null)
        .slice(0, 5)
    : [];

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

      {doParque?.parque && parque && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              Imperdíveis da família
            </span>
            <Link
              href={`/roteiro/atracoes?parque=${dia.parqueCode}&ver=familia`}
              className="flex items-center gap-1 text-[11.5px] font-extrabold text-gold-light"
            >
              ranking completo
              <ChevronRightIcon width={13} height={13} strokeWidth={2.2} />
            </Link>
          </div>
          {imperdiveis.length === 0 ? (
            <Link
              href={`/roteiro/atracoes/classificar?parque=${dia.parqueCode}`}
              className="flex items-center gap-3.5 rounded-card border border-stroke bg-surface px-4 py-[15px]"
            >
              <StarIcon width={20} height={20} className="shrink-0 text-gold" />
              <span className="grow text-[13px] text-ink-muted">
                Ninguém deu nota ainda nas {doParque.parque.total} atrações do {parque.nome} — começa você.
              </span>
              <ChevronRightIcon width={15} height={15} className="shrink-0 text-ink-faint" />
            </Link>
          ) : (
            <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.08)] rounded-card border border-stroke bg-surface">
              {imperdiveis.map((i, n) => (
                <div key={i.atracao.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-4 font-display text-[15px] font-semibold ${n < 3 ? "text-gold-light" : "text-ink-faint"}`}>
                    {n + 1}
                  </span>
                  <div className="flex min-w-0 grow flex-col">
                    <span className="truncate text-[13.5px] font-extrabold">{i.atracao.nome}</span>
                    {precisaTroca(i.atracao.alturaMinCm, doParque.criancas) && (
                      <span className="text-[11px] font-bold text-lavanda">{trocaLabel(i.atracao.parqueCode)}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] font-extrabold text-ink-muted">
                    {i.media!.toFixed(1).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          )}
          {doParque.parque.minhas < doParque.parque.total && imperdiveis.length > 0 && (
            <Link
              href={`/roteiro/atracoes/classificar?parque=${dia.parqueCode}`}
              className="text-[12px] font-bold text-ink-muted underline underline-offset-2"
            >
              {doParque.parque.total - doParque.parque.minhas === 1
                ? "falta 1 nota sua neste parque"
                : `faltam ${doParque.parque.total - doParque.parque.minhas} notas suas neste parque`}
            </Link>
          )}
        </div>
      )}

      {dia.hospedagemNoite && (
        <div className="flex items-center gap-3.5 rounded-card border border-stroke bg-surface px-4 py-[15px]">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-gold/[0.12]">
            <BedIcon width={20} height={20} className="text-gold" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-extrabold">Dormimos no {dia.hospedagemNoite}</span>
            {estadias.length === 0 && (
              <span className="text-[12px] text-ink-muted">detalhes em Hospedagens</span>
            )}
            {estadias.map((e) => (
              <span key={e.id} className="text-[12px] text-ink-muted">
                {[
                  // com duas estadias na mesma noite, diz quem fica em cada uma
                  estadias.length > 1 ? (e.quem ?? e.nome) : null,
                  e.tipo,
                  periodoEstadia(e.checkin, e.checkout),
                ]
                  .filter(Boolean)
                  .join(" · ") || "detalhes em Hospedagens"}
              </span>
            ))}
          </div>
        </div>
      )}

      {dia.notas && <p className="text-[12.5px] leading-relaxed text-ink-muted">{dia.notas}</p>}
    </div>
  );
}
