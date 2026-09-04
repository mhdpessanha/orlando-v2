import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { moeda as fmtMoeda } from "@/lib/format";
import { getFinanceiroResumo } from "@/lib/queries";

export const metadata = { title: "Financeiro · Orlando 2027" };

const NUCLEO_LABEL: Record<string, string> = {
  pessanha: "Família Pessanha",
  gabi: "Família da Gabi",
  vitor: "Vitor",
  mariana: "Mariana",
};

const NUCLEO_COR: Record<string, string> = {
  pessanha: "#f6c453",
  gabi: "#ff8a7a",
  vitor: "#5fd0c5",
  mariana: "#5fd0c5",
};

function CardMoeda({
  moeda,
  total,
  pago,
  restante,
  varias,
}: {
  moeda: string;
  total: number;
  pago: number;
  restante: number;
  varias: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-3.5 rounded-card-lg border border-stroke bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-[3px] text-ink-faint">
          TOTAL DA VIAGEM{varias ? ` · ${moeda}` : ""}
        </span>
        <span className="text-[12px] font-extrabold text-gold-light">{pct}% pago</span>
      </div>

      <span className="font-display text-[34px] font-semibold leading-none">
        {fmtMoeda(total, moeda)}
      </span>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-0.5 rounded-[13px] border border-stroke bg-white/[0.04] px-3.5 py-3">
          <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">PAGO</span>
          <span className="text-[15px] font-extrabold">{fmtMoeda(pago, moeda)}</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-[13px] border border-stroke bg-white/[0.04] px-3.5 py-3">
          <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">FALTA</span>
          <span
            className={`text-[15px] font-extrabold ${restante > 0 ? "text-gold-light" : "text-ink-faint"}`}
          >
            {restante > 0 ? fmtMoeda(restante, moeda) : "quitado"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;
  const nucleos = await getFinanceiroResumo(user);
  const admin = user.papel === "admin";

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Financeiro</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {admin
            ? "visão do admin · todos os núcleos"
            : NUCLEO_LABEL[user.nucleo] ?? user.nucleo}
        </span>
      </div>

      {nucleos.length === 0 && (
        <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
          Os valores aparecem aqui após o sync da planilha.
        </div>
      )}

      {nucleos.map(({ nucleo, moedas }) => (
        <section key={nucleo} className="flex flex-col gap-3">
          {admin && (
            <div className="flex items-center gap-2">
              <span
                className="h-[3px] w-4 rounded-sm"
                style={{ background: NUCLEO_COR[nucleo] ?? "#b7a9e8" }}
              />
              <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                {NUCLEO_LABEL[nucleo] ?? nucleo}
              </span>
            </div>
          )}
          {moedas.filter((m) => m.preenchido).length === 0 ? (
            <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
              Os valores {admin ? "deste núcleo" : "do seu núcleo"} ainda estão sendo preenchidos
              na planilha.
            </div>
          ) : (
            moedas
              .filter((m) => m.preenchido)
              .map((m) => (
                <CardMoeda key={m.moeda} {...m} varias={moedas.filter((x) => x.preenchido).length > 1} />
              ))
          )}
        </section>
      ))}

      <p className="text-center text-[11px] text-ink-faint">
        valores vêm da planilha do Murilo · cada núcleo vê só o que é seu
      </p>
    </div>
  );
}
