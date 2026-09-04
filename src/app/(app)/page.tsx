import Link from "next/link";
import Countdown from "@/components/Countdown";
import {
  CalendarIcon,
  ChevronRightIcon,
  HouseIcon,
  PlaneIcon,
  SparkleIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/icons";
import { chipPrazo, diaNumero, diaSemanaCurto, diaMes } from "@/lib/format";
import { PARQUE_INFO } from "@/lib/parques";
import { getHomeData } from "@/lib/queries";

function StarField() {
  return (
    <svg
      className="absolute left-0 top-0 h-[260px] w-full"
      viewBox="0 0 390 260"
      fill="none"
      aria-hidden
    >
      <g fill="#ffffff" className="animate-twinkle">
        <circle cx="28" cy="34" r="1.4" />
        <circle cx="352" cy="52" r="1.2" />
        <circle cx="70" cy="120" r="1" />
        <circle cx="330" cy="150" r="1.3" />
        <circle cx="45" cy="210" r="1.1" />
        <circle cx="300" cy="228" r="1" />
        <circle cx="196" cy="16" r="1.2" />
      </g>
      <g fill="#ffffff" opacity="0.55" className="animate-twinkle-slow">
        <circle cx="110" cy="48" r="0.9" />
        <circle cx="260" cy="30" r="1" />
        <circle cx="20" cy="150" r="0.8" />
        <circle cx="372" cy="110" r="0.9" />
        <circle cx="150" cy="236" r="0.8" />
        <circle cx="245" cy="205" r="0.9" />
        <circle cx="90" cy="176" r="0.7" />
        <circle cx="310" cy="90" r="0.8" />
      </g>
      <path d="M60 70l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#f6c453" opacity="0.8" />
      <path d="M328 190l1.3 3.6 3.6 1.3-3.6 1.3-1.3 3.6-1.3-3.6-3.6-1.3 3.6-1.3z" fill="#f6c453" opacity="0.6" />
    </svg>
  );
}

function StatChip({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full border border-stroke bg-surface px-[13px] py-2 text-[12px] font-bold text-ink-soft"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function marcoEstilo(categoria: string | null) {
  if (categoria && /adr|reserva|restaurante/i.test(categoria)) {
    return { Icon: CalendarIcon, cor: "#57c7d8", bg: "rgba(87,199,216,0.14)" };
  }
  return { Icon: SparkleIcon, cor: "#8f7bff", bg: "rgba(143,123,255,0.14)" };
}

export default async function HomePage() {
  const { chips, magia, marcos, proximosDias, totalDias } = await getHomeData();

  return (
    <div className="flex flex-col gap-[26px] pt-[26px]">
      <section className="relative pb-1.5 pt-[18px] text-center">
        <div className="absolute -top-1.5 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(143,123,255,0.32)_0%,rgba(143,123,255,0)_68%)]" />
        <StarField />
        <div className="relative flex flex-col items-center gap-1.5">
          <Countdown />
          <Link
            href="/voos"
            className="mt-2.5 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-4 py-[9px] text-[12px] font-bold text-gold-light"
          >
            <PlaneIcon width={15} height={15} />
            <span>GIG → MCO · 7 de janeiro · 21h05</span>
          </Link>
        </div>
      </section>

      <section className="flex justify-center gap-2">
        <StatChip
          href="/turma"
          icon={<UsersIcon width={14} height={14} className="text-lavanda" />}
          label={`${chips.viajantes} viajantes`}
        />
        <StatChip
          href="/roteiro"
          icon={<TicketIcon width={14} height={14} className="text-lavanda" />}
          label={`${chips.diasParque} dias de parque`}
        />
        <StatChip
          href="/hospedagens"
          icon={<HouseIcon width={14} height={14} className="text-lavanda" />}
          label={`${chips.casas} casas`}
        />
      </section>

      {magia && (
        <section className="flex flex-col gap-2 rounded-card border border-[rgba(143,123,255,0.45)] bg-[linear-gradient(135deg,rgba(143,123,255,0.18),rgba(87,199,216,0.1))] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[7px]">
              <SparkleIcon width={15} height={15} className="text-lavanda" />
              <span className="text-[10px] font-extrabold tracking-[3px] text-lavanda">
                MAGIA DO DIA
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-ink-faint">
              #{magia.ordem} de {magia.total}
            </span>
          </div>
          <span className="text-[14px] font-bold leading-[1.45]">{magia.texto}</span>
          <span className="text-[11.5px] text-ink-muted">
            uma curiosidade nova por dia, até a gente ver de perto
          </span>
        </section>
      )}

      {marcos.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Próximos marcos
          </span>
          {marcos.map((m, i) => {
            const { Icon, cor, bg } = marcoEstilo(m.categoria);
            const destaque = i === 0 && m.data;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3.5 rounded-card border border-stroke bg-surface px-4 py-[15px]"
              >
                <div
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px]"
                  style={{ background: bg }}
                >
                  <Icon width={20} height={20} style={{ color: cor }} />
                </div>
                <div className="flex grow flex-col gap-0.5">
                  <span className="text-[14px] font-extrabold">{m.titulo}</span>
                  <span className="text-[12px] text-ink-muted">
                    {m.data ? diaMes(m.data) : "data a definir"}
                    {m.hora ? ` · ${m.hora.replace(":", "h")}` : ""}
                    {m.descricao ? ` · ${m.descricao}` : ""}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-[5px] text-[11px] font-extrabold ${
                    destaque
                      ? "border-gold/40 bg-gold/[0.14] text-gold-light"
                      : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
                  }`}
                >
                  {m.data ? chipPrazo(m.data) : "sem data"}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {proximosDias.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Como tudo começa
          </span>
          {proximosDias.map((d) => {
            const parque = d.parqueCode ? PARQUE_INFO[d.parqueCode] : null;
            return (
              <Link key={d.id} href={`/roteiro/${d.id}`} className="flex items-center gap-[13px]">
                <div className="flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[13px] border border-stroke bg-surface">
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
                    {d.destaque ?? d.hospedagemNoite ?? parque?.nome ?? ""}
                  </span>
                </div>
                <span
                  className="h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{ background: parque?.cor ?? "#f6c453" }}
                />
              </Link>
            );
          })}
          <Link
            href="/roteiro"
            className="flex items-center justify-center gap-1.5 pt-3 text-[13px] font-extrabold text-gold-light"
          >
            <span>Ver os {totalDias} dias</span>
            <ChevronRightIcon width={15} height={15} strokeWidth={2} />
          </Link>
        </section>
      )}

      {!magia && marcos.length === 0 && proximosDias.length === 0 && (
        <section className="flex flex-col gap-2 rounded-card border border-[rgba(143,123,255,0.45)] bg-[linear-gradient(135deg,rgba(143,123,255,0.18),rgba(87,199,216,0.1))] p-4">
          <div className="flex items-center gap-[7px]">
            <SparkleIcon width={15} height={15} className="text-lavanda" />
            <span className="text-[10px] font-extrabold tracking-[3px] text-lavanda">
              EM CONSTRUÇÃO
            </span>
          </div>
          <span className="text-[14px] font-bold leading-[1.45]">
            O conteúdo da viagem aparece aqui assim que a primeira sincronização com a planilha
            rodar.
          </span>
        </section>
      )}
    </div>
  );
}
