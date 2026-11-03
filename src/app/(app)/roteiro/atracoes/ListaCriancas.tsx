import Link from "next/link";
import Avatar from "@/components/Avatar";
import CopyButton from "@/components/CopyButton";
import { ChevronRightIcon, UsersIcon } from "@/components/icons";
import {
  alturaM,
  criancaPode,
  fotoSrc,
  hrefClassificar,
  noLimite,
  NOTAS,
  notaInfo,
  tipoLabel,
  trocaLabel,
} from "@/lib/atracoes";
import { hexRgba, PARQUE_INFO } from "@/lib/parques";
import { rankingFamilia, type AtracaoCriancas, type CriancaInfo } from "@/lib/queries";
import BotoesNota, { NotasPelasCriancas } from "./BotoesNota";
import DetalheAtracao from "./DetalheAtracao";
import EditarAltura from "./EditarAltura";
import FotoAtracao from "./FotoAtracao";
import ItemAtracao from "./ItemAtracao";

function media(m: number): string {
  return m.toFixed(1).replace(".", ",");
}


// "mín. 1,02 m" / "sem altura mínima"
function alturaTexto(alturaMinCm: number | null): string {
  return alturaMinCm === null ? "sem altura mínima" : `mín. ${alturaM(alturaMinCm)}`;
}

// Quem deu cada nota (na folha)
function NotasDasCriancas({ item }: { item: AtracaoCriancas }) {
  if (item.votos.length === 0) {
    return <span className="text-[12.5px] text-ink-muted">nenhuma criança tem nota aqui ainda</span>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Notas das crianças
        </span>
        {item.media !== null && (
          <span className="text-[11px] font-extrabold text-ink-muted">média {media(item.media)} de 3</span>
        )}
      </div>
      {NOTAS.map((n) => {
        const votos = item.votos.filter((v) => v.nota === n.valor);
        if (votos.length === 0) return null;
        return (
          <div key={n.valor} className="flex items-baseline gap-2 text-[13px]">
            <span className="flex shrink-0 items-center gap-1.5 font-extrabold" style={{ color: n.cor }}>
              <span className="h-2 w-2 rounded-full" style={{ background: n.cor }} />
              {n.label}
            </span>
            <span className="font-semibold text-ink-soft">
              {votos.map((v) => (v.por ? `${v.nome} (com ${v.por})` : v.nome)).join(", ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Folha de uma atração na aba Crianças. Com uma criança escolhida (e sendo filho/a
// de quem está logado), a nota é a dela; em "Todas", uma linha por filho/a que alcança.
function Detalhe({
  item,
  cor,
  criancas,
  crianca,
}: {
  item: AtracaoCriancas;
  cor: string;
  criancas: CriancaInfo[];
  crianca: CriancaInfo | null;
}) {
  const a = item.atracao;
  const notaDe = (id: string) => item.votos.find((v) => v.id === id)?.nota ?? null;
  let nota = null;
  if (crianca) {
    if (crianca.minha && criancaPode(a.alturaMinCm, crianca.alturaCm)) {
      nota = (
        <BotoesNota attractionId={a.id} nota={notaDe(crianca.id)} crianca={{ id: crianca.id, nome: crianca.nome }} />
      );
    }
  } else {
    const minhas = criancas.filter((c) => c.minha && criancaPode(a.alturaMinCm, c.alturaCm));
    nota = (
      <NotasPelasCriancas
        attractionId={a.id}
        criancas={minhas.map((c) => ({ id: c.id, nome: c.nome, a: c.a, nota: notaDe(c.id) }))}
      />
    );
  }
  return (
    <DetalheAtracao a={a} foto={fotoSrc(a)} cor={cor} criancas={criancas} nota={nota}>
      <NotasDasCriancas item={item} />
    </DetalheAtracao>
  );
}

// Linha da lista de uma criança
function CardDaCrianca({
  item,
  cor,
  criancas,
  crianca,
  alcanca = true,
}: {
  item: AtracaoCriancas;
  cor: string;
  criancas: CriancaInfo[];
  crianca: CriancaInfo;
  alcanca?: boolean;
}) {
  const a = item.atracao;
  const falta = !alcanca && a.alturaMinCm !== null && crianca.alturaCm !== null ? a.alturaMinCm - crianca.alturaCm : null;
  return (
    <ItemAtracao
      titulo={a.nome}
      rotulo={PARQUE_INFO[a.parqueCode]?.nome}
      className={`flex items-center gap-3 rounded-card border border-stroke bg-surface p-2.5 pr-3.5 ${alcanca ? "" : "opacity-60"}`}
      detalhe={<Detalhe item={item} cor={cor} criancas={criancas} crianca={crianca} />}
    >
      <FotoAtracao src={fotoSrc(a)} cor={cor} alt={a.nome} className="h-[46px] w-[62px] rounded-[11px]" />
      <div className="flex min-w-0 grow flex-col gap-[1px]">
        <span className="truncate text-[14px] font-extrabold">{a.nome}</span>
        <span className="truncate text-[11.5px] text-ink-muted">
          {alcanca ? (
            <>
              {[tipoLabel(a.tipo), alturaTexto(a.alturaMinCm)].filter(Boolean).join(" · ")}
              {noLimite(a.alturaMinCm, crianca.alturaCm) && (
                <span className="font-extrabold text-gold-light"> · no limite</span>
              )}
            </>
          ) : (
            `mín. ${alturaM(a.alturaMinCm!)}${falta !== null ? ` · faltam ${falta} cm` : ""} · ${trocaLabel(a.parqueCode)}`
          )}
        </span>
      </div>
      <ChevronRightIcon width={14} height={14} className="shrink-0 text-ink-faint" />
    </ItemAtracao>
  );
}

// Linha do ranking das crianças: média delas, rostinhos com a cor da nota e quem
// não alcança.
function CardRanking({
  item,
  posicao,
  cor,
  criancas,
}: {
  item: AtracaoCriancas;
  posicao: number | null;
  cor: string;
  criancas: CriancaInfo[];
}) {
  const a = item.atracao;
  const top = posicao !== null && posicao <= 3;
  const naoAlcancam = criancas.filter((c) => c.alturaCm !== null && !criancaPode(a.alturaMinCm, c.alturaCm));
  const votos = [...item.votos].sort((x, y) => y.nota - x.nota);
  return (
    <ItemAtracao
      titulo={a.nome}
      rotulo={posicao !== null ? `#${posicao} das crianças` : PARQUE_INFO[a.parqueCode]?.nome}
      className={`flex flex-col gap-2 rounded-card border bg-surface p-3 ${top ? "border-gold/40" : "border-stroke"}`}
      detalhe={<Detalhe item={item} cor={cor} criancas={criancas} crianca={null} />}
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
            <div className="flex flex-wrap gap-[7px] pt-0.5">
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
            </div>
          )}
        </div>
        {item.media !== null && (
          <span className={`shrink-0 font-display text-[18px] font-semibold ${top ? "text-gold-light" : ""}`}>
            {media(item.media)}
          </span>
        )}
      </div>
      {(a.alturaMinCm !== null || naoAlcancam.length > 0) && (
        <span className="pl-8 text-[11px] font-bold text-ink-faint">
          {a.alturaMinCm !== null && `mín. ${alturaM(a.alturaMinCm)}`}
          {naoAlcancam.length > 0 && (
            <span className="text-lavanda">
              {" "}
              · {naoAlcancam.map((c) => c.nome).join(" e ")} não {naoAlcancam.length === 1 ? "alcança" : "alcançam"}
            </span>
          )}
        </span>
      )}
    </ItemAtracao>
  );
}

// Texto pro admin colar quando for montar a Agenda
function rankingTexto(nomeParque: string, ranking: AtracaoCriancas[]): string {
  const linhas = ranking
    .filter((i) => i.media !== null)
    .map((i, n) => {
      const notas = i.votos.map((v) => `${v.nome} ${notaInfo(v.nota).label.toLowerCase()}`).join(", ");
      const alt = i.atracao.alturaMinCm !== null ? ` · mín. ${alturaM(i.atracao.alturaMinCm)}` : "";
      return `${n + 1}. ${i.atracao.nome} — ${media(i.media!)} (${notas})${alt}`;
    });
  const semNota = ranking.filter((i) => i.media === null).map((i) => i.atracao.nome);
  return [
    `Ranking das crianças — ${nomeParque}`,
    ...linhas,
    ...(semNota.length > 0 ? [`Sem nota ainda: ${semNota.join(", ")}`] : []),
  ].join("\n");
}

function Rotulo({ children, cor }: { children: React.ReactNode; cor?: string }) {
  return (
    <span
      className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[2.5px]"
      style={{ color: cor ?? "#8b89b0" }}
    >
      {cor && <span className="h-2 w-2 rounded-full" style={{ background: cor }} />}
      {children}
    </span>
  );
}

// Escolha de criança: "Todas" (ranking) ou uma delas (a lista dela)
export function SeletorCrianca({
  criancas,
  ativa,
  href,
}: {
  criancas: CriancaInfo[];
  ativa: string | null;
  href: (criancaId: string | null) => string;
}) {
  const opcoes = [null, ...criancas];
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
      {opcoes.map((c) => {
        const atual = (c?.id ?? null) === ativa;
        return (
          <Link
            key={c?.id ?? "todas"}
            href={href(c?.id ?? null)}
            aria-current={atual ? "page" : undefined}
            className={`flex flex-col items-center gap-1.5 rounded-[14px] border py-2 ${
              atual ? "border-gold/50 bg-gold/[0.1]" : "border-stroke bg-white/[0.03]"
            }`}
          >
            {c ? (
              <Avatar a={c.a} size={34} />
            ) : (
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/[0.08] text-lavanda">
                <UsersIcon width={17} height={17} />
              </span>
            )}
            <span className={`text-[11.5px] font-extrabold ${atual ? "text-gold-light" : "text-ink-muted"}`}>
              {c ? c.nome : "Todas"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function ListaCriancas({
  itens,
  criancas,
  crianca,
  parque,
  cor,
  nomeParque,
  admin,
}: {
  itens: AtracaoCriancas[];
  criancas: CriancaInfo[];
  crianca: CriancaInfo | null;
  parque: string;
  cor: string;
  nomeParque: string;
  admin: boolean;
}) {
  if (!crianca) {
    // Todas: ranking das crianças (só o que alguma delas alcança)
    const ranking = rankingFamilia(itens.filter((i) => i.podem.length > 0));
    const comNota = ranking.filter((i) => i.media !== null);
    const semNota = ranking.filter((i) => i.media === null);
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Rotulo>Ranking das crianças</Rotulo>
            <span className="text-[11.5px] leading-relaxed text-ink-faint">
              notas que os pais dão vendo o vídeo com elas — não entram na média dos adultos
            </span>
          </div>
          {admin && comNota.length > 0 && (
            <CopyButton texto={rankingTexto(nomeParque, ranking)} label="Copiar o ranking" />
          )}
        </div>
        {comNota.map((item, i) => (
          <CardRanking key={item.atracao.id} item={item} posicao={i + 1} cor={cor} criancas={criancas} />
        ))}
        {semNota.length > 0 && (
          <>
            <span className="pt-2 text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              Sem nota ainda · {semNota.length}
            </span>
            {semNota.map((item) => (
              <CardRanking key={item.atracao.id} item={item} posicao={null} cor={cor} criancas={criancas} />
            ))}
          </>
        )}
      </section>
    );
  }

  // Uma criança: o que ela alcança, agrupado pela nota dela
  const notaDela = (i: AtracaoCriancas) => i.votos.find((v) => v.id === crianca.id)?.nota ?? null;
  const alcanca = itens.filter((i) => criancaPode(i.atracao.alturaMinCm, crianca.alturaCm));
  const foraDeAlcance = itens.filter((i) => !criancaPode(i.atracao.alturaMinCm, crianca.alturaCm));
  const semNota = alcanca.filter((i) => notaDela(i) === null);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-card border border-stroke bg-surface p-4">
        <div className="flex items-center gap-3">
          <Avatar a={crianca.a} size={48} />
          <div className="flex min-w-0 grow flex-col gap-1">
            <span className="font-display text-[20px] font-semibold leading-none">{crianca.nome}</span>
            <EditarAltura crianca={crianca} podeEditar={crianca.minha} />
          </div>
        </div>
        <span className="text-[12.5px] leading-relaxed text-ink-muted">
          {crianca.alturaCm === null
            ? `Sem a altura, aparecem só as ${alcanca.length} atrações sem altura mínima do ${nomeParque}${
                foraDeAlcance.length > 0 ? ` (outras ${foraDeAlcance.length} têm altura mínima)` : ""
              }.`
            : `Alcança ${alcanca.length} de ${itens.length} atrações do ${nomeParque}.`}
          {crianca.minha && " Mostra o vídeo e deixa escolher — cada toque já fica salvo."}
        </span>
        {crianca.minha && alcanca.length > 0 && (
          <Link
            href={hrefClassificar(parque, crianca.id)}
            className="flex items-center justify-center gap-1.5 rounded-[13px] border px-3 py-2.5 text-[13px] font-extrabold"
            style={{ color: cor, borderColor: hexRgba(cor, 0.5), background: hexRgba(cor, 0.12) }}
          >
            {semNota.length === 0
              ? `Revisar as notas de ${crianca.nome}`
              : `Dar nota com ${crianca.nome} · ${semNota.length} ${semNota.length === 1 ? "falta" : "faltam"}`}
            <ChevronRightIcon width={14} height={14} strokeWidth={2.2} />
          </Link>
        )}
      </div>

      {NOTAS.map((n) => {
        const doTier = alcanca.filter((i) => notaDela(i) === n.valor);
        if (doTier.length === 0) return null;
        return (
          <section key={n.valor} className="flex flex-col gap-2.5">
            <Rotulo cor={n.cor}>
              {n.label} · {doTier.length}
            </Rotulo>
            {doTier.map((item) => (
              <CardDaCrianca key={item.atracao.id} item={item} cor={cor} criancas={criancas} crianca={crianca} />
            ))}
          </section>
        );
      })}
      {semNota.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <Rotulo>Sem nota ainda · {semNota.length}</Rotulo>
          {semNota.map((item) => (
            <CardDaCrianca key={item.atracao.id} item={item} cor={cor} criancas={criancas} crianca={crianca} />
          ))}
        </section>
      )}
      {crianca.alturaCm !== null && foraDeAlcance.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <Rotulo>Ainda não alcança · {foraDeAlcance.length}</Rotulo>
          {foraDeAlcance.map((item) => (
            <CardDaCrianca
              key={item.atracao.id}
              item={item}
              cor={cor}
              criancas={criancas}
              crianca={crianca}
              alcanca={false}
            />
          ))}
        </section>
      )}
    </>
  );
}
