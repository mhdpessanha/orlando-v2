import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChevronRightIcon, CheckIcon } from "@/components/icons";
import { chipPrazo, diaMes, diasAte } from "@/lib/format";
import { getPendencias, type PendenciaAuto } from "@/lib/queries";

export const metadata = { title: "Pendências · Orlando 2027" };

const ORIGEM_COR: Record<PendenciaAuto["origem"], string> = {
  Voos: "#57c7d8",
  Hospedagens: "#f6c453",
  Marcos: "#8f7bff",
  Guia: "#5fbf7a",
  Gastos: "#ff8f66",
};

function ChipPrazo({ prazo }: { prazo: string | null }) {
  if (!prazo) return null;
  const d = diasAte(prazo);
  const urgente = d <= 7;
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold ${
        d < 0
          ? "border-[rgba(255,143,102,0.5)] bg-[rgba(255,143,102,0.14)] text-[#ffb08f]"
          : urgente
            ? "border-gold/45 bg-gold/[0.14] text-gold-light"
            : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
      }`}
    >
      {d < 0 ? `venceu ${diaMes(prazo)}` : chipPrazo(prazo)}
    </span>
  );
}

export default async function PendenciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.papel !== "admin") redirect("/");

  const { abertas, feitas, auto } = await getPendencias();
  const total = abertas.length + auto.length;

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Pendências</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {total === 0
            ? "nada em aberto — o plano está redondo"
            : `${total} ${total === 1 ? "coisa" : "coisas"} pra resolver · só você vê esta tela`}
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Lista da planilha
        </span>
        {abertas.length === 0 && (
          <div className="flex flex-col gap-1.5 rounded-card border border-dashed border-stroke bg-surface p-4">
            <span className="text-[13.5px] font-extrabold">
              {feitas.length > 0 ? "tudo da lista está feito" : "nenhuma pendência na aba Pendencias"}
            </span>
            {feitas.length === 0 && (
              <span className="text-[12px] leading-relaxed text-ink-muted">
                cria a aba <span className="font-bold text-ink-soft">Pendencias</span> na planilha com
                as colunas id, titulo, categoria, responsavel, prazo, status, notas — o sync pega
                sozinho.
              </span>
            )}
          </div>
        )}
        {abertas.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-card border border-stroke bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[14.5px] font-extrabold leading-snug">{p.titulo}</span>
              <ChipPrazo prazo={p.prazo} />
            </div>
            {(p.categoria || p.responsavel) && (
              <span className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-lavanda">
                {[p.categoria, p.responsavel].filter(Boolean).join(" · ")}
              </span>
            )}
            {p.notas && (
              <span className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-muted">
                {p.notas}
              </span>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Radar automático
          </span>
          <span className="text-[11.5px] text-ink-faint">
            o que o site enxerga nas outras abas: voo sem emissão, hospedagem sem confirmação, marco
            vencido, guia vazio, gasto seu em aberto
          </span>
        </div>
        {auto.length === 0 && (
          <div className="flex items-center gap-2.5 rounded-card border border-dashed border-stroke bg-surface p-4 text-[13px] font-bold text-ink-muted">
            <CheckIcon width={16} height={16} className="text-gold-light" />
            nada detectado
          </div>
        )}
        {auto.map((a) => (
          <Link
            key={a.key}
            href={a.href}
            className="flex items-center gap-3.5 rounded-card border border-stroke bg-surface px-4 py-[13px]"
          >
            <span
              className="h-9 w-[3px] shrink-0 rounded-full"
              style={{ background: ORIGEM_COR[a.origem] }}
            />
            <div className="flex min-w-0 grow flex-col gap-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[2px]" style={{ color: ORIGEM_COR[a.origem] }}>
                {a.origem}
              </span>
              <span className="text-[13.5px] font-extrabold leading-snug">{a.titulo}</span>
              {a.detalhe && <span className="text-[12px] text-ink-muted">{a.detalhe}</span>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <ChipPrazo prazo={a.prazo} />
              <ChevronRightIcon width={14} height={14} className="text-ink-faint" />
            </div>
          </Link>
        ))}
      </section>

      {feitas.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Feitas
          </span>
          {feitas.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-card border border-stroke bg-surface px-4 py-3 opacity-70"
            >
              <CheckIcon width={16} height={16} className="shrink-0 text-gold-light" />
              <span className="text-[13px] font-bold text-ink-muted line-through decoration-ink-faint">
                {p.titulo}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
