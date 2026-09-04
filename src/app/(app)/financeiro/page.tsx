import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { moeda as fmtMoeda } from "@/lib/format";
import { getFinanceiro } from "@/lib/queries";

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

type Item = Awaited<ReturnType<typeof getFinanceiro>>[number]["itens"][number];

// totais por moeda (somar BRL com USD não faz sentido)
function totaisPorMoeda(itens: Item[]) {
  const porMoeda = new Map<string, { total: number; pago: number }>();
  for (const i of itens) {
    const code = i.moeda ?? "BRL";
    const t = porMoeda.get(code) ?? { total: 0, pago: 0 };
    t.total += i.valorTotal ?? 0;
    t.pago += i.valorPago ?? 0;
    porMoeda.set(code, t);
  }
  return [...porMoeda.entries()].map(([code, t]) => ({ code, ...t }));
}

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;
  const nucleos = await getFinanceiro(user);

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Financeiro</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {user.papel === "admin"
            ? "visão do admin · todos os núcleos"
            : `só o seu núcleo aparece aqui (${NUCLEO_LABEL[user.nucleo] ?? user.nucleo})`}
        </span>
      </div>

      {nucleos.length === 0 && (
        <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
          Os valores aparecem aqui após o sync da planilha.
        </div>
      )}

      {nucleos.map(({ nucleo, itens }) => (
        <section key={nucleo} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-[3px] w-4 rounded-sm"
              style={{ background: NUCLEO_COR[nucleo] ?? "#b7a9e8" }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              {NUCLEO_LABEL[nucleo] ?? nucleo}
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-stroke bg-surface p-4">
            {totaisPorMoeda(itens).map(({ code, total, pago }) => {
              const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
              return (
                <div key={code} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-extrabold">
                      {fmtMoeda(pago, code)}{" "}
                      <span className="font-semibold text-ink-muted">
                        pagos de {fmtMoeda(total, code)}
                      </span>
                    </span>
                    <span className="text-[12px] font-extrabold text-gold-light">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col">
            {itens.map((i, idx) => {
              const falta = i.valorRestante ?? (
                i.valorTotal != null && i.valorPago != null ? i.valorTotal - i.valorPago : null
              );
              return (
                <div
                  key={i.id}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    idx > 0 ? "border-t border-[rgba(255,255,255,0.08)]" : ""
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] font-extrabold">{i.item}</span>
                    {i.notas && <span className="text-[11.5px] text-ink-muted">{i.notas}</span>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {i.valorTotal != null && (
                      <span className="text-[13px] font-extrabold">
                        {fmtMoeda(i.valorTotal, i.moeda)}
                      </span>
                    )}
                    {falta != null && (
                      <span
                        className={`text-[11px] font-bold ${
                          falta > 0 ? "text-gold-light" : "text-ink-faint"
                        }`}
                      >
                        {falta > 0 ? `falta ${fmtMoeda(falta, i.moeda)}` : "quitado"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-center text-[11px] text-ink-faint">
        valores vêm da planilha do Murilo · cada núcleo vê só o que é seu
      </p>
    </div>
  );
}
