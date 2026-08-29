import Countdown from "@/components/Countdown";
import { HouseIcon, PlaneIcon, SparkleIcon, TicketIcon, UsersIcon } from "@/components/icons";

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

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-stroke bg-surface px-[13px] py-2 text-[12px] font-bold text-ink-soft">
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-[26px] pt-[26px]">
      <section className="relative pb-1.5 pt-[18px] text-center">
        <div className="absolute -top-1.5 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(143,123,255,0.32)_0%,rgba(143,123,255,0)_68%)]" />
        <StarField />
        <div className="relative flex flex-col items-center gap-1.5">
          <Countdown />
          <div className="mt-2.5 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-4 py-[9px] text-[12px] font-bold text-gold-light">
            <PlaneIcon width={15} height={15} />
            <span>GIG → MCO · 7 de janeiro · 21h05</span>
          </div>
        </div>
      </section>

      <section className="flex justify-center gap-2">
        <StatChip
          icon={<UsersIcon width={14} height={14} className="text-lavanda" />}
          label="9 viajantes"
        />
        <StatChip
          icon={<TicketIcon width={14} height={14} className="text-lavanda" />}
          label="12 dias de parque"
        />
        <StatChip
          icon={<HouseIcon width={14} height={14} className="text-lavanda" />}
          label="3 casas"
        />
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-[rgba(143,123,255,0.45)] bg-[linear-gradient(135deg,rgba(143,123,255,0.18),rgba(87,199,216,0.1))] p-4">
        <div className="flex items-center gap-[7px]">
          <SparkleIcon width={15} height={15} className="text-lavanda" />
          <span className="text-[10px] font-extrabold tracking-[3px] text-lavanda">
            EM CONSTRUÇÃO
          </span>
        </div>
        <span className="text-[14px] font-bold leading-[1.45]">
          O site está nascendo: roteiro dia a dia, voos, hospedagens, a turma completa e o guia da
          viagem chegam aqui em breve.
        </span>
        <span className="text-[11.5px] text-ink-muted">
          enquanto isso, o relógio acima já está valendo
        </span>
      </section>
    </div>
  );
}
