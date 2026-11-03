import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import CopyButton from "@/components/CopyButton";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import {
  alturaM,
  fotoSrc,
  hrefClassificar,
  NOTAS,
  notaInfo,
  precisaTroca,
  resumoCriancas,
  tipoLabel,
  trocaLabel,
  type Crianca,
} from "@/lib/atracoes";
import { diaMes } from "@/lib/format";
import { hexRgba, PARQUE_INFO } from "@/lib/parques";
import {
  getAtracoes,
  getAtracoesCriancas,
  getProgressoCriancas,
  rankingFamilia,
  type AtracaoDecorada,
} from "@/lib/queries";
import AbasRoteiro from "../AbasRoteiro";
import BotoesNota from "./BotoesNota";
import DetalheAtracao from "./DetalheAtracao";
import FotoAtracao from "./FotoAtracao";
import ItemAtracao from "./ItemAtracao";
import ListaCriancas, { SeletorCrianca } from "./ListaCriancas";
import TrilhaParques from "./TrilhaParques";

export const metadata = { title: "Atrações · Orlando 2027" };

const COR_PADRAO = "#b7a9e8";

function corDoParque(code: string) {
  return PARQUE_INFO[code]?.cor ?? COR_PADRAO;
}

// "10 e 13 de janeiro"
function datasDoParque(datas: string[]): string | null {
  if (datas.length === 0) return null;
  if (datas.length === 1) return diaMes(datas[0]);
  const ultimo = diaMes(datas[datas.length - 1]);
  const mes = ultimo.replace(/^\d+ /, "");
  const dias = datas.map((d) => String(Number(d.slice(8))));
  return `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]} ${mes}`;
}

function media(m: number): string {
  return m.toFixed(1).replace(".", ",");
}

// Quem deu cada nota (na folha)
function NotasFamilia({ item, criancas }: { item: AtracaoDecorada; criancas: Crianca[] }) {
  if (item.votos.length === 0 && item.criancas.length === 0) {
    return <span className="text-[12.5px] text-ink-muted">ninguém da família deu nota ainda</span>;
  }
  const passam = item.votos.filter((v) => v.nota === 0).map((v) => v.nome);
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Notas da família
        </span>
        {item.media !== null && (
          <span className="text-[11px] font-extrabold text-ink-muted">média {media(item.media)} de 3</span>
        )}
      </div>
      {NOTAS.map((n) => {
        const nomes = item.votos.filter((v) => v.nota === n.valor).map((v) => v.nome);
        if (nomes.length === 0) return null;
        return (
          <div key={n.valor} className="flex items-baseline gap-2 text-[13px]">
            <span className="flex shrink-0 items-center gap-1.5 font-extrabold" style={{ color: n.cor }}>
              <span className="h-2 w-2 rounded-full" style={{ background: n.cor }} />
              {n.label}
            </span>
            <span className="font-semibold text-ink-soft">{nomes.join(", ")}</span>
          </div>
        );
      })}
      {item.faltam.length > 0 && (
        <span className="text-[11.5px] text-ink-faint">falta: {item.faltam.join(", ")}</span>
      )}
      {item.criancas.length > 0 && (
        <span className="border-t border-white/[0.08] pt-2 text-[12px] font-semibold text-ink-muted">
          Crianças (fora da média):{" "}
          {item.criancas.map((c) => `${c.nome} ${notaInfo(c.nota).label.toLowerCase()}`).join(" · ")}
        </span>
      )}
      {passam.length > 0 && precisaTroca(item.atracao.alturaMinCm, criancas) && (
        <span className="text-[12px] font-semibold text-lavanda">
          {passam.join(", ")} {passam.length === 1 ? "passa" : "passam"} — dá pra ficar com as crianças enquanto
          os outros vão.
        </span>
      )}
    </div>
  );
}

function Detalhe({ item, cor, criancas }: { item: AtracaoDecorada; cor: string; criancas: Crianca[] }) {
  return (
    <DetalheAtracao
      a={item.atracao}
      foto={fotoSrc(item.atracao)}
      cor={cor}
      criancas={criancas}
      nota={<BotoesNota attractionId={item.atracao.id} nota={item.minhaNota} />}
    >
      <NotasFamilia item={item} criancas={criancas} />
    </DetalheAtracao>
  );
}

function CardMinha({ item, cor, criancas }: { item: AtracaoDecorada; cor: string; criancas: Crianca[] }) {
  const a = item.atracao;
  return (
    <ItemAtracao
      titulo={a.nome}
      rotulo={PARQUE_INFO[a.parqueCode]?.nome}
      className="flex items-center gap-3 rounded-card border border-stroke bg-surface p-2.5 pr-3.5"
      detalhe={<Detalhe item={item} cor={cor} criancas={criancas} />}
    >
      <FotoAtracao src={fotoSrc(a)} cor={cor} alt={a.nome} className="h-[46px] w-[62px] rounded-[11px]" />
      <div className="flex min-w-0 grow flex-col gap-[1px]">
        <span className="truncate text-[14px] font-extrabold">{a.nome}</span>
        <span className="truncate text-[11.5px] text-ink-muted">
          {[tipoLabel(a.tipo), resumoCriancas(a.alturaMinCm, criancas)].filter(Boolean).join(" · ")}
        </span>
      </div>
      <ChevronRightIcon width={14} height={14} className="shrink-0 text-ink-faint" />
    </ItemAtracao>
  );
}

function CardFamilia({
  item,
  posicao,
  cor,
  criancas,
}: {
  item: AtracaoDecorada;
  posicao: number | null;
  cor: string;
  criancas: Crianca[];
}) {
  const a = item.atracao;
  const top = posicao !== null && posicao <= 3;
  const troca = precisaTroca(a.alturaMinCm, criancas);
  const votos = [...item.votos].sort((x, y) => y.nota - x.nota);
  return (
    <ItemAtracao
      titulo={a.nome}
      rotulo={posicao !== null ? `#${posicao} da família` : PARQUE_INFO[a.parqueCode]?.nome}
      className={`flex flex-col gap-2 rounded-card border bg-surface p-3 ${top ? "border-gold/40" : "border-stroke"}`}
      detalhe={<Detalhe item={item} cor={cor} criancas={criancas} />}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-5 shrink-0 text-center font-display text-[16px] font-semibold ${
            top ? "text-gold-light" : "text-ink-faint"
          }`}
        >
          {posicao ?? "–"}
        </span>
        <FotoAtracao src={fotoSrc(a)} cor={cor} alt={a.nome} className="h-[50px] w-[50px] rounded-[12px]" />
        <div className="flex min-w-0 grow flex-col gap-1.5">
          <span className="truncate text-[14px] font-extrabold">{a.nome}</span>
          {item.media !== null ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full ${top ? "bg-gradient-to-r from-gold to-gold-light" : "bg-lavanda/60"}`}
                style={{ width: `${(item.media / 3) * 100}%` }}
              />
            </div>
          ) : (
            <span className="text-[11.5px] text-ink-faint">sem nota ainda</span>
          )}
          {(votos.length > 0 || item.criancas.length > 0) && (
            <div className="flex flex-wrap items-center gap-[7px] pt-0.5">
              {votos.map((v) => (
                <Avatar
                  key={v.id}
                  a={{ ...v.a, nome: `${v.nome}: ${notaInfo(v.nota).label}` }}
                  size={22}
                  style={{
                    boxShadow: `0 0 0 1.5px #101641, 0 0 0 3px ${notaInfo(v.nota).cor}`,
                    opacity: v.nota === 0 ? 0.55 : 1,
                  }}
                />
              ))}
              {/* crianças: menores, depois de um tracinho — não entram na média */}
              {item.criancas.length > 0 && (
                <>
                  {votos.length > 0 && <span className="mx-0.5 h-3.5 w-px bg-white/20" aria-hidden />}
                  {[...item.criancas]
                    .sort((x, y) => y.nota - x.nota)
                    .map((c) => (
                      <Avatar
                        key={c.id}
                        a={{ ...c.a, nome: `${c.nome}: ${notaInfo(c.nota).label}` }}
                        size={18}
                        style={{
                          boxShadow: `0 0 0 1.5px #101641, 0 0 0 3px ${notaInfo(c.nota).cor}`,
                          opacity: c.nota === 0 ? 0.55 : 1,
                        }}
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>
        {item.media !== null && (
          <span className={`shrink-0 font-display text-[18px] font-semibold ${top ? "text-gold-light" : ""}`}>
            {media(item.media)}
          </span>
        )}
      </div>
      {a.alturaMinCm !== null && (
        <span className="pl-8 text-[11px] font-bold text-ink-faint">
          {resumoCriancas(a.alturaMinCm, criancas)}
          {troca && <span className="text-lavanda"> · {trocaLabel(a.parqueCode)}</span>}
        </span>
      )}
    </ItemAtracao>
  );
}

// Texto pro admin colar na planilha/notas quando for montar a Agenda
function rankingTexto(nomeParque: string, ranking: AtracaoDecorada[], criancas: Crianca[]): string {
  const linhas = ranking
    .filter((i) => i.media !== null)
    .map((i, n) => {
      const cont = NOTAS.map((t) => [t.label.toLowerCase(), i.votos.filter((v) => v.nota === t.valor).length] as const)
        .filter(([, c]) => c > 0)
        .map(([l, c]) => `${c} ${l}`)
        .join(", ");
      const passam = i.votos.filter((v) => v.nota === 0).map((v) => v.nome);
      const extras = [
        i.atracao.alturaMinCm !== null ? `mín. ${alturaM(i.atracao.alturaMinCm)}` : null,
        precisaTroca(i.atracao.alturaMinCm, criancas) ? trocaLabel(i.atracao.parqueCode) : null,
        passam.length > 0 ? `passam: ${passam.join(", ")}` : null,
        i.criancas.length > 0
          ? `crianças: ${i.criancas.map((c) => `${c.nome} ${notaInfo(c.nota).label.toLowerCase()}`).join(", ")}`
          : null,
      ].filter(Boolean);
      return `${n + 1}. ${i.atracao.nome} — ${media(i.media!)} (${cont})${extras.length ? ` · ${extras.join(" · ")}` : ""}`;
    });
  const semNota = ranking.filter((i) => i.media === null).map((i) => i.atracao.nome);
  return [
    `Ranking da família — ${nomeParque}`,
    ...linhas,
    ...(semNota.length > 0 ? [`Sem nota ainda: ${semNota.join(", ")}`] : []),
  ].join("\n");
}

export default async function AtracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ parque?: string; ver?: string; crianca?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parque: parqueSel, ver, crianca: criancaSel } = await searchParams;
  const aba = ver === "familia" ? "familia" : ver === "criancas" ? "criancas" : "minha";
  const familia = aba === "familia";
  const [adultos, dasCriancas, progressoFilhos] = await Promise.all([
    getAtracoes(session.user, parqueSel),
    aba === "criancas" ? getAtracoesCriancas(session.user, parqueSel, criancaSel) : null,
    getProgressoCriancas(session.user.nucleo),
  ]);
  const { parques, itens, criancas, total, minhasTotal, totalVotantes } = adultos;
  // na aba Crianças, o parque (e a trilha) é o da lista delas — inclui o Peppa Pig
  const parque = dasCriancas ? dasCriancas.parque : adultos.parque;
  const pendentes = total - minhasTotal;
  const parquesProntos = parques.filter((p) => p.minhas >= p.total).length;
  // "continuar" vai pro primeiro parque (na ordem do roteiro) com nota faltando
  const continuar = parques.find((p) => p.minhas < p.total) ?? null;
  const cor = parque ? corDoParque(parque.code) : COR_PADRAO;
  const nomeParque = parque ? (PARQUE_INFO[parque.code]?.nome ?? parque.code) : "";
  const faltamNoParque = parque ? parque.total - parque.minhas : 0;
  const href = (code: string, v: string, criancaId?: string | null) =>
    `/roteiro/atracoes?parque=${code}${v !== "minha" ? `&ver=${v}` : ""}${criancaId ? `&crianca=${criancaId}` : ""}`;
  const criancaAtiva = dasCriancas?.crianca ?? null;

  const ranking = rankingFamilia(itens);
  const comNota = ranking.filter((i) => i.media !== null);
  const semNota = ranking.filter((i) => i.media === null);
  const incompletos = [...new Set(itens.flatMap((i) => i.faltam))];

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Roteiro</h1>
          <span className="text-[13px] font-semibold text-ink-muted">
            cada um dá sua nota — o roteiro dos parques sai daqui
          </span>
        </div>
        <AbasRoteiro ativa="atracoes" pendentes={pendentes} />
      </div>

      {!parque ? (
        <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
          As atrações aparecem aqui assim que a aba Atracoes da planilha sincronizar.
        </div>
      ) : (
        <>
          <div
            className={`flex flex-col gap-3 rounded-card border p-4 ${
              pendentes > 0
                ? "border-gold/40 bg-[linear-gradient(135deg,rgba(246,196,83,0.16),rgba(246,196,83,0.04))]"
                : "border-stroke bg-surface"
            }`}
          >
            <div className="flex items-end justify-between gap-3">
              <span className="text-[14px] font-extrabold">
                {pendentes > 0 ? `Sua nota em ${minhasTotal} de ${total} atrações` : `Você deu nota nas ${total} atrações`}
              </span>
              {pendentes === 0 ? (
                <CheckIcon width={18} height={18} className="shrink-0 text-gold-light" />
              ) : (
                <span className="shrink-0 text-[11.5px] font-bold text-ink-muted">
                  {parquesProntos} de {parques.length} parques
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                style={{ width: `${(minhasTotal / total) * 100}%` }}
              />
            </div>
            <span className="text-[12px] leading-relaxed text-ink-muted">
              São {parques.length} parques. Cada toque já fica salvo: dá pra trocar de parque, parar no meio e
              continuar depois, até em outro aparelho.
            </span>
            {continuar && (
              <Link
                href={`/roteiro/atracoes/classificar?parque=${continuar.code}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[#2a1c05]"
              >
                <span className="flex flex-col items-center">
                  <span className="text-[14px] font-extrabold">
                    {minhasTotal === 0 ? "Começar pelo" : "Continuar:"} {PARQUE_INFO[continuar.code]?.nome ?? continuar.code}
                  </span>
                  <span className="text-[11.5px] font-bold opacity-75">
                    {continuar.total - continuar.minhas === 1
                      ? "1 sem nota"
                      : `${continuar.total - continuar.minhas} sem nota`}
                  </span>
                </span>
                <ChevronRightIcon width={16} height={16} strokeWidth={2.2} className="shrink-0" />
              </Link>
            )}
            {progressoFilhos.length > 0 && (
              <div className="flex flex-col border-t border-white/[0.1] pt-1">
                <span className="pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                  Com as crianças
                </span>
                {progressoFilhos.map(({ crianca: c, total: t, feitas, proximo }) => (
                  <Link
                    key={c.id}
                    href={
                      proximo
                        ? hrefClassificar(proximo, c.id)
                        : href(parque.code, "criancas", c.id)
                    }
                    className="flex items-center gap-3 py-2"
                  >
                    <Avatar a={c.a} size={30} />
                    <span className="flex min-w-0 grow flex-col gap-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[13.5px] font-extrabold">{c.nome}</span>
                        <span className="text-[11.5px] font-bold text-ink-muted">
                          {c.alturaCm === null ? "falta a altura · " : ""}
                          {feitas} de {t}
                        </span>
                      </span>
                      <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <span
                          className="block h-full rounded-full bg-lavanda"
                          style={{ width: `${t ? (feitas / t) * 100 : 0}%` }}
                        />
                      </span>
                    </span>
                    {feitas >= t ? (
                      <CheckIcon width={16} height={16} className="shrink-0 text-gold-light" />
                    ) : (
                      <ChevronRightIcon width={15} height={15} className="shrink-0 text-ink-faint" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              Parques · toque pra trocar
            </span>
            {dasCriancas ? (
              <TrilhaParques
                parques={dasCriancas.parques}
                ativo={parque.code}
                href={(code) => href(code, "criancas", criancaAtiva?.id)}
                quem={criancaAtiva ? `notas de ${criancaAtiva.nome}` : "notas das crianças"}
              />
            ) : (
              <TrilhaParques parques={parques} ativo={parque.code} href={(code) => href(code, aba)} />
            )}
          </div>

          <section className="flex flex-col gap-3">
            <div
              className="flex flex-col gap-2 rounded-card-lg border p-4"
              style={{
                borderColor: hexRgba(cor, 0.38),
                background: `linear-gradient(135deg, ${hexRgba(cor, 0.16)}, rgba(255,255,255,0.04))`,
              }}
            >
              <span className="text-[10px] font-extrabold tracking-[3px]" style={{ color: cor }}>
                {datasDoParque(parque.dias)?.toUpperCase() ?? "FORA DO ROTEIRO"}
              </span>
              <span className="font-display text-[26px] font-semibold leading-none">{nomeParque}</span>
              <span className="text-[12.5px] text-ink-muted">
                {dasCriancas
                  ? criancaAtiva
                    ? `notas de ${criancaAtiva.nome}: ${parque.minhas} de ${parque.total}`
                    : `notas das crianças: ${parque.minhas} de ${parque.total}`
                  : `${parque.total} ${parque.total === 1 ? "atração" : "atrações"} · ${
                      faltamNoParque === 0
                        ? "você já deu nota em todas"
                        : faltamNoParque === 1
                          ? "falta 1 nota sua"
                          : `faltam ${faltamNoParque} notas suas`
                    }`}
              </span>
              {!dasCriancas && faltamNoParque > 0 && (
                <Link
                  href={`/roteiro/atracoes/classificar?parque=${parque.code}`}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-[13px] border px-3 py-2.5 text-[13px] font-extrabold"
                  style={{ color: cor, borderColor: hexRgba(cor, 0.5), background: hexRgba(cor, 0.12) }}
                >
                  {faltamNoParque === 1 ? "Dar a nota que falta" : `Dar nota nas ${faltamNoParque} que faltam`}
                  <ChevronRightIcon width={14} height={14} strokeWidth={2.2} />
                </Link>
              )}
            </div>

            <div className="flex gap-1 rounded-full border border-stroke bg-white/[0.04] p-1">
              {[
                { v: "minha", label: "Minha lista" },
                { v: "familia", label: "Família" },
                { v: "criancas", label: "Crianças" },
              ].map((t) => (
                <Link
                  key={t.v}
                  href={href(parque.code, t.v)}
                  className={`flex-1 rounded-full py-[7px] text-center text-[12.5px] font-extrabold ${
                    aba === t.v ? "bg-white/[0.1] text-ink" : "text-ink-faint"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </section>

          {dasCriancas ? (
            <>
              <SeletorCrianca
                criancas={dasCriancas.criancas}
                ativa={criancaAtiva?.id ?? null}
                href={(id) => href(parque.code, "criancas", id)}
              />
              <ListaCriancas
                itens={dasCriancas.itens}
                criancas={dasCriancas.criancas}
                crianca={criancaAtiva}
                parque={parque.code}
                cor={cor}
                nomeParque={nomeParque}
                admin={session.user.papel === "admin"}
              />
            </>
          ) : familia ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                    Ranking da família
                  </span>
                  <span className="text-[11.5px] text-ink-faint">
                    {incompletos.length === 0
                      ? `os ${totalVotantes} já deram nota em tudo aqui`
                      : `ainda dando nota: ${incompletos.join(", ")}`}
                  </span>
                </div>
                {session.user.papel === "admin" && comNota.length > 0 && (
                  <CopyButton texto={rankingTexto(nomeParque, ranking, criancas)} label="Copiar o ranking" />
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {NOTAS.map((n) => (
                  <span key={n.valor} className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink-faint">
                    <span className="h-2 w-2 rounded-full" style={{ background: n.cor }} />
                    {n.label}
                  </span>
                ))}
              </div>
              {comNota.map((item, i) => (
                <CardFamilia key={item.atracao.id} item={item} posicao={i + 1} cor={cor} criancas={criancas} />
              ))}
              {semNota.length > 0 && (
                <>
                  <span className="pt-2 text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                    Sem nota ainda · {semNota.length}
                  </span>
                  {semNota.map((item) => (
                    <CardFamilia key={item.atracao.id} item={item} posicao={null} cor={cor} criancas={criancas} />
                  ))}
                </>
              )}
            </section>
          ) : (
            <>
              {NOTAS.map((n) => {
                const doTier = itens.filter((i) => i.minhaNota === n.valor);
                if (doTier.length === 0) return null;
                return (
                  <section key={n.valor} className="flex flex-col gap-2.5">
                    <span
                      className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[2.5px]"
                      style={{ color: n.cor }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: n.cor }} />
                      {n.label} · {doTier.length}
                    </span>
                    {doTier.map((item) => (
                      <CardMinha key={item.atracao.id} item={item} cor={cor} criancas={criancas} />
                    ))}
                  </section>
                );
              })}
              {itens.some((i) => i.minhaNota === null) && (
                <section className="flex flex-col gap-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                    Sem nota ainda · {itens.filter((i) => i.minhaNota === null).length}
                  </span>
                  {itens
                    .filter((i) => i.minhaNota === null)
                    .map((item) => (
                      <CardMinha key={item.atracao.id} item={item} cor={cor} criancas={criancas} />
                    ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
