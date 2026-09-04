import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Texto } from "@/components/Campo";
import { TituloExpansivel } from "@/components/Detalhe";
import { CheckIcon } from "@/components/icons";
import { chipPrazo, diaMes } from "@/lib/format";
import { getDecisoes } from "@/lib/queries";
import { votarAction } from "./actions";

export const metadata = { title: "Decisões · Orlando 2027" };

type Decisao = Awaited<ReturnType<typeof getDecisoes>>[number];

function BarraResultado({
  votantes,
  total,
  destaque,
}: {
  votantes: string[];
  total: number;
  destaque: boolean;
}) {
  const pct = total > 0 ? Math.round((votantes.length / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full ${destaque ? "bg-gradient-to-r from-gold to-gold-light" : "bg-lavanda/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10.5px] text-ink-faint">
        {votantes.length === 0 ? "ninguém ainda" : votantes.join(", ")}
      </span>
    </div>
  );
}

function DetalheDecisao({ d }: { d: Decisao }) {
  const { poll, opcoes, aberta, totalVotos, faltam } = d;
  return (
    <>
      <span className="text-[12.5px] font-bold text-ink-muted">
        {aberta
          ? poll.encerraEm
            ? `aberta até ${diaMes(poll.encerraEm)}`
            : "aberta, sem prazo definido"
          : `decidida com ${totalVotos} ${totalVotos === 1 ? "voto" : "votos"}`}
      </span>

      {poll.detalhe && (
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{poll.detalhe}</p>
      )}
      {poll.explicacao ? (
        <Texto label="Explicação">{poll.explicacao}</Texto>
      ) : (
        !poll.detalhe && (
          <span className="text-[12.5px] text-ink-muted">
            sem explicação extra por enquanto — vem da planilha
          </span>
        )
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Opções
        </span>
        <ul className="flex flex-col gap-1">
          {opcoes.map((o) => (
            <li key={o} className="flex items-center gap-2 text-[13.5px] font-semibold">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lavanda" />
              {o}
            </li>
          ))}
        </ul>
      </div>

      {aberta && faltam.length > 0 && (
        <span className="text-[11.5px] text-ink-faint">ainda não votaram: {faltam.join(", ")}</span>
      )}
    </>
  );
}

function CardDecisao({ d }: { d: Decisao }) {
  const { poll, aberta, meuVoto, porOpcao, totalVotos, faltam } = d;
  const mostrarResultado = meuVoto !== null || !aberta;
  const maisVotada = Math.max(0, ...porOpcao.map((o) => o.votantes.length));

  return (
    <div
      className={`flex flex-col gap-3 rounded-card border p-4 ${
        aberta ? "border-gold/35 bg-surface" : "border-stroke bg-surface opacity-90"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <TituloExpansivel
            titulo={poll.pergunta}
            rotulo={aberta ? "Decisão em aberto" : "Decidida"}
            className="text-[15px] font-extrabold leading-snug"
            detalhe={<DetalheDecisao d={d} />}
          >
            {poll.pergunta}
          </TituloExpansivel>
          {poll.detalhe && (
            <span className="line-clamp-2 text-[12px] text-ink-muted">{poll.detalhe}</span>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold ${
            aberta
              ? "border-gold/45 bg-gold/[0.14] text-gold-light"
              : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
          }`}
        >
          {aberta
            ? poll.encerraEm
              ? `encerra ${chipPrazo(poll.encerraEm) === "é hoje" ? "hoje" : chipPrazo(poll.encerraEm)}`
              : "aberta"
            : "decidida"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {porOpcao.map(({ opcao, votantes }) => {
          const minha = meuVoto === opcao;
          const vencedora = !aberta && votantes.length === maisVotada && maisVotada > 0;
          const conteudo = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[13.5px] font-bold ${vencedora || minha ? "text-gold-light" : ""}`}>
                  {opcao}
                </span>
                <span className="flex items-center gap-1.5">
                  {minha && <CheckIcon width={14} height={14} className="text-gold-light" />}
                  {mostrarResultado && (
                    <span className="text-[11px] font-extrabold text-ink-faint">
                      {votantes.length}
                    </span>
                  )}
                </span>
              </div>
              {mostrarResultado && (
                <BarraResultado
                  votantes={votantes}
                  total={totalVotos}
                  destaque={minha || vencedora}
                />
              )}
            </>
          );
          const estilo = `flex w-full flex-col gap-1.5 rounded-[13px] border px-3.5 py-3 text-left ${
            minha || vencedora
              ? "border-gold/50 bg-gold/[0.08]"
              : "border-stroke bg-white/[0.04]"
          }`;

          if (!aberta) {
            return (
              <div key={opcao} className={estilo}>
                {conteudo}
              </div>
            );
          }
          return (
            <form key={opcao} action={votarAction}>
              <input type="hidden" name="pollId" value={poll.id} />
              <input type="hidden" name="opcao" value={opcao} />
              <button type="submit" className={`${estilo} transition-colors active:scale-[0.99]`}>
                {conteudo}
              </button>
            </form>
          );
        })}
      </div>

      <span className="text-[11px] text-ink-faint">
        {aberta
          ? meuVoto
            ? faltam.length > 0
              ? `pode mudar o voto até fechar · faltam: ${faltam.join(", ")}`
              : "todo mundo votou — o Murilo fecha quando bater o martelo"
            : "toca numa opção pra votar — o parcial aparece depois"
          : `decidido com ${totalVotos} ${totalVotos === 1 ? "voto" : "votos"}`}
      </span>
    </div>
  );
}

export default async function DecisoesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const decisoes = await getDecisoes(session.userId);

  const abertas = decisoes.filter((d) => d.aberta);
  const fechadas = decisoes.filter((d) => !d.aberta);

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Decisões</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {decisoes.length > 0
            ? "vota aí — é assim que a gente fecha o plano"
            : "nenhuma decisão em pauta (elas vêm da aba Decisoes da planilha)"}
        </span>
      </div>

      {abertas.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Em aberto
          </span>
          {abertas.map((d) => (
            <CardDecisao key={d.poll.id} d={d} />
          ))}
        </section>
      )}

      {fechadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            Decididas
          </span>
          {fechadas.map((d) => (
            <CardDecisao key={d.poll.id} d={d} />
          ))}
        </section>
      )}
    </div>
  );
}
