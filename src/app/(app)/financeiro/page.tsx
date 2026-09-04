import { redirect } from "next/navigation";
import { CardExpansivel } from "@/components/Detalhe";
import { Texto } from "@/components/Campo";
import { CheckIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { chipPrazo, ddmm, diaMes, diasAte, moeda as fmt } from "@/lib/format";
import { gastoFalta, getFinanceiro, type Saldo } from "@/lib/queries";

export const metadata = { title: "Financeiro · Orlando 2027" };

const NUCLEO_LABEL: Record<string, string> = {
  pessanha: "Família Pessanha",
  gabi: "Família da Gabi",
  vitor: "Vitor",
  mariana: "Mariana",
  todos: "Todo mundo",
};

const NUCLEO_COR: Record<string, string> = {
  pessanha: "#f6c453",
  gabi: "#ff8a7a",
  vitor: "#5fd0c5",
  mariana: "#5fd0c5",
};

type Fin = Awaited<ReturnType<typeof getFinanceiro>>;
type Nucleo = Fin["nucleos"][number];

function Rotulo({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
      {children}
    </span>
  );
}

function Barra({ pct, cor }: { pct: number; cor?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className={`h-full rounded-full ${cor ? "" : "bg-gradient-to-r from-gold to-gold-light"}`}
        style={{ width: `${pct}%`, ...(cor ? { background: cor } : {}) }}
      />
    </div>
  );
}

function Par({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-[13px] border border-stroke bg-white/[0.04] px-3.5 py-3">
      <span className="text-[9.5px] font-extrabold tracking-[2.5px] text-ink-faint">{label}</span>
      <span className={`text-[15px] font-extrabold ${destaque ? "text-gold-light" : ""}`}>{valor}</span>
    </div>
  );
}

// Card grande: total, barra, pago × falta (usado pro pacote e pro consolidado)
function CardSaldo({ titulo, saldo, rodape }: { titulo: string; saldo: Saldo; rodape?: string }) {
  const pct = saldo.total > 0 ? Math.min(100, Math.round((saldo.pago / saldo.total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-3.5 rounded-card-lg border border-stroke bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-[3px] text-ink-faint">{titulo}</span>
        <span className="text-[12px] font-extrabold text-gold-light">{pct}% pago</span>
      </div>
      <span className="font-display text-[34px] font-semibold leading-none">
        {fmt(saldo.total, saldo.moeda)}
      </span>
      <Barra pct={pct} />
      <div className="flex gap-3">
        <Par label="PAGO" valor={fmt(saldo.pago, saldo.moeda)} />
        <Par
          label="FALTA"
          valor={saldo.falta > 0 ? fmt(saldo.falta, saldo.moeda) : "quitado"}
          destaque={saldo.falta > 0}
        />
      </div>
      {rodape && <span className="text-[12px] leading-relaxed text-ink-muted">{rodape}</span>}
    </div>
  );
}

function ListaPagamentos({ pagamentos }: { pagamentos: Nucleo["pagamentos"] }) {
  if (pagamentos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-stroke bg-surface px-4 py-[13px] text-[12.5px] text-ink-muted">
        nenhum pagamento registrado ainda
      </div>
    );
  }
  return (
    <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.08)] rounded-card border border-stroke bg-surface">
      {pagamentos.map((p) => (
        <div key={p.id} className="flex items-center gap-3 px-4 py-3">
          <CheckIcon width={15} height={15} className="shrink-0 text-gold-light" />
          <div className="flex min-w-0 grow flex-col">
            <span className="text-[13px] font-extrabold">
              {p.valor != null ? fmt(p.valor, p.moeda) : "valor a confirmar"}
            </span>
            {p.descricao && <span className="text-[11.5px] text-ink-muted">{p.descricao}</span>}
          </div>
          <span className="shrink-0 text-[11.5px] font-bold text-ink-faint">
            {p.data ? ddmm(p.data) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function SecaoLevar({ levar, admin }: { levar: Fin["levar"]; admin: boolean }) {
  if (levar.length === 0) return null;
  const grupos = [...new Set(levar.map((l) => l.nucleo))];
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Rotulo>Quanto levar</Rotulo>
        <span className="text-[11.5px] text-ink-faint">
          pra não precisar perguntar de novo no grupo
        </span>
      </div>
      {grupos.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          {(admin || grupos.length > 1) && (
            <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-lavanda">
              {NUCLEO_LABEL[g] ?? g}
            </span>
          )}
          {levar
            .filter((l) => l.nucleo === g)
            .map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3.5 rounded-card border border-[rgba(87,199,216,0.35)] bg-[linear-gradient(135deg,rgba(87,199,216,0.12),rgba(255,255,255,0.03))] px-4 py-[13px]"
              >
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="text-[13.5px] font-extrabold">{l.categoria}</span>
                  <span className="text-[11.5px] text-ink-muted">
                    {[l.base, l.notas].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="shrink-0 font-display text-[20px] font-semibold text-[#8fe0ec]">
                  {l.valor != null ? fmt(l.valor, l.moeda) : "a definir"}
                </span>
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}

function SecaoGastos({ gastos, saldo }: { gastos: Fin["gastos"]; saldo: Fin["gastosSaldo"] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Rotulo>Seus gastos</Rotulo>
        <span className="text-[11.5px] text-ink-faint">o que ainda sai do seu bolso · só você vê</span>
      </div>
      {gastos.length === 0 ? (
        <div className="rounded-card border border-dashed border-stroke bg-surface px-4 py-[13px] text-[12.5px] text-ink-muted">
          nada na aba Gastos ainda
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {saldo.map((s) => (
              <div key={s.moeda} className="flex gap-3">
                <Par label={`PREVISTO ${s.moeda}`} valor={fmt(s.previsto, s.moeda)} />
                <Par label="PAGO" valor={fmt(s.pago, s.moeda)} />
                <Par label="FALTA" valor={fmt(s.falta, s.moeda)} destaque={s.falta > 0} />
              </div>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.08)] rounded-card border border-stroke bg-surface">
            {gastos.map((g) => {
              const falta = gastoFalta(g);
              const feito = falta === 0;
              const d = g.prazo ? diasAte(g.prazo) : null;
              return (
                <div key={g.id} className={`flex items-center gap-3 px-4 py-3 ${feito ? "opacity-60" : ""}`}>
                  <div className="flex min-w-0 grow flex-col gap-0.5">
                    <span className={`text-[13px] font-extrabold ${feito ? "line-through decoration-ink-faint" : ""}`}>
                      {g.item}
                    </span>
                    <span className="text-[11.5px] text-ink-muted">
                      {[
                        g.categoria,
                        g.valorPrevisto != null ? `previsto ${fmt(g.valorPrevisto, g.moeda)}` : "sem valor",
                        g.valorPago ? `pago ${fmt(g.valorPago, g.moeda)}` : null,
                        g.notas,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-[13px] font-extrabold ${feito ? "text-ink-faint" : "text-gold-light"}`}>
                      {feito ? "ok" : falta === null ? "orçar" : fmt(falta, g.moeda)}
                    </span>
                    {g.prazo && !feito && (
                      <span className={`text-[10.5px] font-bold ${d !== null && d < 0 ? "text-[#ffb08f]" : "text-ink-faint"}`}>
                        {d !== null && d < 0 ? `venceu ${diaMes(g.prazo)}` : chipPrazo(g.prazo)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

// Visão de quem paga o pacote: o próprio saldo + os próprios pagamentos
function VisaoNucleo({ n, nucleoLabel }: { n: Nucleo | undefined; nucleoLabel: string }) {
  if (!n || !n.preenchido) {
    return (
      <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
        O valor do seu pacote ainda está sendo fechado na planilha do Murilo.
      </div>
    );
  }
  return (
    <>
      {n.saldos.map((s) => (
        <CardSaldo
          key={s.moeda}
          titulo={n.saldos.length > 1 ? `SEU PACOTE · ${s.moeda}` : "SEU PACOTE"}
          saldo={s}
          rodape={n.pacotes.map((p) => p.descricao).filter(Boolean).join(" · ") || undefined}
        />
      ))}
      <section className="flex flex-col gap-3">
        <Rotulo>Pagamentos</Rotulo>
        <ListaPagamentos pagamentos={n.pagamentos} />
        <span className="text-[11px] text-ink-faint">{nucleoLabel} · registrado pelo Murilo</span>
      </section>
    </>
  );
}

// Visão do admin: consolidado + um card por núcleo (toque abre os pagamentos)
function VisaoAdmin({ fin }: { fin: Fin }) {
  return (
    <>
      {fin.consolidado && fin.consolidado.length > 0 ? (
        fin.consolidado.map((s) => (
          <CardSaldo
            key={s.moeda}
            titulo={fin.consolidado!.length > 1 ? `A RECEBER · ${s.moeda}` : "A RECEBER"}
            saldo={s}
          />
        ))
      ) : (
        <div className="rounded-card border border-dashed border-stroke bg-surface px-4 py-[13px] text-[12.5px] text-ink-muted">
          preenche o valor_total na aba Pacote pra ver o consolidado
        </div>
      )}

      {fin.nucleos.length > 0 && (
        <section className="flex flex-col gap-3">
          <Rotulo>Por núcleo</Rotulo>
          {fin.nucleos.map((n) => {
            const cor = NUCLEO_COR[n.nucleo] ?? "#b7a9e8";
            const label = NUCLEO_LABEL[n.nucleo] ?? n.nucleo;
            return (
              <CardExpansivel
                key={n.nucleo}
                titulo={label}
                rotulo="Pacote"
                className="flex flex-col gap-3 rounded-card border border-stroke bg-surface p-4"
                detalhe={
                  <>
                    {n.saldos.map((s) => (
                      <CardSaldo key={s.moeda} titulo={`PACOTE · ${s.moeda}`} saldo={s} />
                    ))}
                    {n.pacotes.some((p) => p.descricao || p.notas) && (
                      <Texto label="O que inclui">
                        {n.pacotes.map((p) => [p.descricao, p.notas].filter(Boolean).join(" — ")).join("\n")}
                      </Texto>
                    )}
                    <div className="flex flex-col gap-2">
                      <Rotulo>Pagamentos</Rotulo>
                      <ListaPagamentos pagamentos={n.pagamentos} />
                    </div>
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  <span className="h-[3px] w-4 rounded-sm" style={{ background: cor }} />
                  <span className="text-[14px] font-extrabold">{label}</span>
                </div>
                {n.preenchido ? (
                  n.saldos.map((s) => {
                    const pct = s.total > 0 ? Math.min(100, Math.round((s.pago / s.total) * 100)) : 0;
                    return (
                      <div key={s.moeda} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                          <span className="font-display text-[22px] font-semibold leading-none">
                            {fmt(s.total, s.moeda)}
                          </span>
                          <span className="text-[12px] font-extrabold text-ink-muted">
                            {s.falta > 0 ? (
                              <>
                                falta <span className="text-gold-light">{fmt(s.falta, s.moeda)}</span>
                              </>
                            ) : (
                              "quitado"
                            )}
                          </span>
                        </div>
                        <Barra pct={pct} cor={cor} />
                        <span className="text-[11px] text-ink-faint">
                          {pct}% pago · {n.pagamentos.length}{" "}
                          {n.pagamentos.length === 1 ? "pagamento" : "pagamentos"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[12px] text-ink-muted">valor_total ainda em branco</span>
                )}
              </CardExpansivel>
            );
          })}
        </section>
      )}

      <SecaoGastos gastos={fin.gastos} saldo={fin.gastosSaldo} />
    </>
  );
}

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;
  const fin = await getFinanceiro(user);
  const nucleoLabel = NUCLEO_LABEL[user.nucleo] ?? user.nucleo;

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Financeiro</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {fin.admin ? "visão do admin · todos os núcleos" : nucleoLabel}
        </span>
      </div>

      {fin.admin ? (
        <VisaoAdmin fin={fin} />
      ) : (
        <VisaoNucleo n={fin.nucleos[0]} nucleoLabel={nucleoLabel} />
      )}

      <SecaoLevar levar={fin.levar} admin={fin.admin} />

      <p className="text-center text-[11px] text-ink-faint">
        valores vêm da planilha do Murilo · cada núcleo vê só o que é seu
      </p>
    </div>
  );
}
