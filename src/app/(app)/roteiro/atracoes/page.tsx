import Link from "next/link";
import { redirect } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import {
  alturaM,
  fotoSrc,
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
import { getAtracoes, rankingFamilia, type AtracaoDecorada } from "@/lib/queries";
import AbasRoteiro from "../AbasRoteiro";
import BotoesNota from "./BotoesNota";
import DetalheAtracao from "./DetalheAtracao";
import FotoAtracao from "./FotoAtracao";
import ItemAtracao from "./ItemAtracao";

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
  if (item.votos.length === 0) {
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
          {votos.length > 0 && (
            <div className="flex flex-wrap gap-[5px]">
              {votos.map((v) => (
                <span
                  key={v.id}
                  title={`${v.nome}: ${notaInfo(v.nota).label}`}
                  className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[8.5px] font-extrabold"
                  style={{
                    background: v.avatar.bg,
                    color: v.avatar.text,
                    boxShadow: `0 0 0 1.5px #101641, 0 0 0 3px ${notaInfo(v.nota).cor}`,
                    opacity: v.nota === 0 ? 0.55 : 1,
                  }}
                >
                  {v.iniciais}
                </span>
              ))}
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
  searchParams: Promise<{ parque?: string; ver?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parque: parqueSel, ver } = await searchParams;
  const familia = ver === "familia";
  const { parques, parque, itens, criancas, total, minhasTotal, totalVotantes } = await getAtracoes(
    session.userId,
    parqueSel,
  );
  const pendentes = total - minhasTotal;
  const cor = parque ? corDoParque(parque.code) : COR_PADRAO;
  const nomeParque = parque ? (PARQUE_INFO[parque.code]?.nome ?? parque.code) : "";
  const faltamNoParque = parque ? parque.total - parque.minhas : 0;
  const href = (code: string, fam: boolean) => `/roteiro/atracoes?parque=${code}${fam ? "&ver=familia" : ""}`;

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
              {pendentes === 0 && <CheckIcon width={18} height={18} className="shrink-0 text-gold-light" />}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                style={{ width: `${(minhasTotal / total) * 100}%` }}
              />
            </div>
            <span className="text-[12px] leading-relaxed text-ink-muted">
              Cada toque já fica salvo: pode parar no meio e continuar depois, até em outro aparelho.
            </span>
            {pendentes > 0 && (
              <Link
                href="/roteiro/atracoes/classificar"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-deep px-4 py-3 text-[14px] font-extrabold text-[#2a1c05]"
              >
                {minhasTotal === 0 ? "Começar a dar nota" : "Continuar de onde parei"}
                <ChevronRightIcon width={15} height={15} strokeWidth={2.2} />
              </Link>
            )}
          </div>

          <div className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px] pb-1">
            {parques.map((p) => {
              const c = corDoParque(p.code);
              const ativo = p.code === parque.code;
              const completo = p.minhas === p.total;
              return (
                <Link
                  key={p.code}
                  href={href(p.code, familia)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-[7px] text-[12px] font-extrabold"
                  style={
                    ativo
                      ? { color: c, borderColor: c, background: hexRgba(c, 0.2) }
                      : { color: c, borderColor: hexRgba(c, 0.35), background: hexRgba(c, 0.07) }
                  }
                >
                  {p.code}
                  <span className="font-bold text-ink-faint">
                    {completo ? <CheckIcon width={12} height={12} className="text-ink-muted" /> : `${p.minhas}/${p.total}`}
                  </span>
                </Link>
              );
            })}
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
                {parque.total} {parque.total === 1 ? "atração" : "atrações"} ·{" "}
                {faltamNoParque === 0
                  ? "você já deu nota em todas"
                  : faltamNoParque === 1
                    ? "falta 1 nota sua"
                    : `faltam ${faltamNoParque} notas suas`}
              </span>
              {faltamNoParque > 0 && (
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
                { fam: false, label: "Minha lista" },
                { fam: true, label: "Família" },
              ].map((t) => (
                <Link
                  key={t.label}
                  href={href(parque.code, t.fam)}
                  className={`flex-1 rounded-full py-[7px] text-center text-[12.5px] font-extrabold ${
                    familia === t.fam ? "bg-white/[0.1] text-ink" : "text-ink-faint"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </section>

          {familia ? (
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
