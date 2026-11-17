import Link from "next/link";
import { notFound } from "next/navigation";
import type { Attraction, KidsPlanItem, Person } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PlayIcon } from "@/components/icons";
import { fotoSrc, youtubeId, type Crianca } from "@/lib/atracoes";
import { avatarDaPessoa } from "@/lib/caricaturas";
import { diaNumero, diaSemanaCurto, tituloDia } from "@/lib/format";
import { hexRgba, PARQUE_INFO } from "@/lib/parques";
import {
  faixaHoras,
  horaCurta,
  idsAtracoes,
  montarPlano,
  pessoasCitadas,
  statusAberto,
  TIPO_INFO,
  tipoInfo,
  type Entrada,
} from "@/lib/planoCriancas";
import { getPlanoCriancas, indicePorNucleo } from "@/lib/queries";
import AbasRoteiro from "../../AbasRoteiro";
import DetalheAtracao from "../../atracoes/DetalheAtracao";
import FotoAtracao from "../../atracoes/FotoAtracao";
import ItemAtracao from "../../atracoes/ItemAtracao";
import Alternativas from "../../criancas/Alternativas";
import SeletorDias from "../../criancas/SeletorDias";
import SeloAgora from "../../criancas/SeloAgora";

export const metadata = { title: "Plano das crianças · Orlando 2027" };

const COR_PADRAO = "#b7a9e8";
const ROTULO_QUEM: Record<string, string> = {
  criancas: "Com quem",
  adultos: "Quem vai",
  todos: "Quem",
};

type Contexto = {
  data: string;
  pessoas: Person[];
  indices: Map<string, number>;
  atracoes: Map<string, Attraction>;
  criancas: Crianca[];
};

export default async function PlanoCriancasDia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plano = await getPlanoCriancas(id);
  if (!plano) notFound();
  const { dia, dias, itens, pessoas, atracoes } = plano;

  const parque = dia.parqueCode ? PARQUE_INFO[dia.parqueCode] : null;
  const { blocos, reserva } = montarPlano(itens);
  const ctx: Contexto = {
    data: dia.data,
    pessoas,
    indices: indicePorNucleo(pessoas),
    atracoes,
    criancas: pessoas.filter((p) => p.tipo === "crianca").map((p) => ({ nome: p.nome, alturaCm: p.alturaCm })),
  };
  // Dia anterior / próximo dia: pula os dias sem plano (r16 e r18 hoje)
  const comPlano = dias.filter((d) => d.itens > 0);
  const anterior = comPlano.filter((d) => d.data < dia.data).at(-1) ?? null;
  const proximo = comPlano.find((d) => d.data > dia.data) ?? null;
  const tiposDoDia = Object.keys(TIPO_INFO).filter((t) => itens.some((i) => i.tipo === t));

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Plano das crianças</h1>
          <span className="text-[13px] font-semibold text-ink-muted">
            Hora a hora: onde elas estão e com quem
          </span>
        </div>
        <AbasRoteiro ativa="criancas" />
      </div>

      {dias.length > 0 && (
        <SeletorDias
          ativo={dia.id}
          dias={dias.map((d) => ({
            id: d.id,
            numero: diaNumero(d.data),
            semana: diaSemanaCurto(d.data),
            cor: d.parqueCode ? (PARQUE_INFO[d.parqueCode]?.cor ?? null) : null,
            temPlano: d.itens > 0,
          }))}
        />
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-display text-[21px] font-semibold leading-[1.15]">{tituloDia(dia.data)}</h2>
            <span className="text-[13px] font-bold text-ink-muted">{dia.titulo}</span>
          </div>
          {parque && (
            <span
              className="mt-1 shrink-0 rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold"
              style={{
                color: parque.cor,
                borderColor: hexRgba(parque.cor, 0.45),
                background: hexRgba(parque.cor, 0.13),
              }}
            >
              {dia.parqueCode}
            </span>
          )}
        </div>
        <Link
          href={`/roteiro/${dia.id}`}
          className="flex items-center gap-1 self-start text-[11.5px] font-extrabold text-gold-light"
        >
          ver o dia no roteiro
          <ChevronRightIcon width={13} height={13} strokeWidth={2.2} />
        </Link>
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col gap-1.5 rounded-card border border-stroke bg-surface px-4 py-[15px]">
          <span className="text-[14px] font-extrabold">Este dia não tem plano hora a hora</span>
          <span className="text-[12.5px] leading-relaxed text-ink-muted">
            O que está combinado pra ele fica no roteiro do dia. Se o plano for escrito na planilha, ele aparece
            aqui.
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
            {tiposDoDia.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] font-extrabold text-ink-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: TIPO_INFO[t].cor }} />
                {TIPO_INFO[t].label}
              </span>
            ))}
          </div>

          {blocos.map((b) => (
            <section key={b.chave} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                  {b.nome ?? "No dia"}
                </span>
                {b.inicio && (
                  <span className="shrink-0 text-[11px] font-bold text-ink-faint">
                    {faixaHoras(b.inicio, b.fim)}
                  </span>
                )}
              </div>
              {b.entradas.map((e) => (
                <EntradaPlano key={e.tipo === "item" ? e.item.id : e.id} entrada={e} ctx={ctx} />
              ))}
            </section>
          ))}

          {reserva.length > 0 && (
            <section className="flex flex-col gap-2.5 rounded-card-lg border border-nucleo-gabi/40 bg-nucleo-gabi/[0.07] p-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-nucleo-gabi">
                  Se o dia desandar
                </span>
                <span className="text-[12px] font-semibold text-ink-muted">
                  Plano D: a saída combinada, sem culpa.
                </span>
              </div>
              {reserva.map((i) => (
                <CardItem key={i.id} item={i} ctx={ctx} semSelo />
              ))}
            </section>
          )}
        </>
      )}

      {(anterior || proximo) && (
        <nav aria-label="Outros dias do plano" className="grid grid-cols-2 gap-2.5">
          {anterior ? (
            <Link
              href={`/roteiro/${anterior.id}/criancas`}
              className="flex min-w-0 items-center gap-2 rounded-card border border-stroke bg-surface px-3 py-3"
            >
              <ChevronLeftIcon width={16} height={16} strokeWidth={2.2} className="shrink-0 text-gold-light" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ink-faint">
                  Dia anterior
                </span>
                <span className="truncate text-[13px] font-extrabold">
                  {diaSemanaCurto(anterior.data)} {diaNumero(anterior.data)}
                </span>
                <span className="truncate text-[11.5px] font-semibold text-ink-muted">{anterior.titulo}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {proximo && (
            <Link
              href={`/roteiro/${proximo.id}/criancas`}
              className="flex min-w-0 items-center justify-end gap-2 rounded-card border border-stroke bg-surface px-3 py-3 text-right"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ink-faint">
                  Próximo dia
                </span>
                <span className="truncate text-[13px] font-extrabold">
                  {diaSemanaCurto(proximo.data)} {diaNumero(proximo.data)}
                </span>
                <span className="truncate text-[11.5px] font-semibold text-ink-muted">{proximo.titulo}</span>
              </span>
              <ChevronRightIcon width={16} height={16} strokeWidth={2.2} className="shrink-0 text-gold-light" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function EntradaPlano({ entrada, ctx }: { entrada: Entrada; ctx: Contexto }) {
  if (entrada.tipo === "item") return <CardItem item={entrada.item} ctx={ctx} />;
  const tipo = entrada.opcoes[0].itens[0].tipo;
  return (
    <Alternativas
      cor={tipoInfo(tipo).cor}
      opcoes={entrada.opcoes.map((o) => ({
        letra: o.letra,
        titulo: o.itens.map((i) => i.titulo).join(" + "),
        quem: o.itens[0].quem,
        conteudo: o.itens.map((i) => <CardItem key={i.id} item={i} ctx={ctx} semSelo />),
      }))}
    />
  );
}

// Um item do dia: hora, título, QUEM em destaque, local, detalhe e as atrações.
function CardItem({ item, ctx, semSelo }: { item: KidsPlanItem; ctx: Contexto; semSelo?: boolean }) {
  const tipo = tipoInfo(item.tipo);
  const aberto = statusAberto(item.status);
  const rostos = pessoasCitadas(item.quem, ctx.pessoas);
  const atracoes = idsAtracoes(item).flatMap((id) => ctx.atracoes.get(id) ?? []);
  const videoProprio = atracoes.length === 0 ? youtubeId(item.videoUrl) : null;

  return (
    <div
      className="flex flex-col gap-2.5 rounded-card border border-stroke bg-surface py-3 pl-3.5 pr-3.5"
      style={{ borderLeftWidth: 3, borderLeftColor: tipo.cor }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.horaInicio && (
            <span className="font-display text-[15px] font-semibold leading-none" style={{ color: tipo.cor }}>
              {horaCurta(item.horaInicio)}
              {item.horaFim && (
                <span className="text-[12px] font-medium text-ink-faint"> até {horaCurta(item.horaFim)}</span>
              )}
            </span>
          )}
          {item.horaInicio && <SeloAgora data={ctx.data} inicio={item.horaInicio} fim={item.horaFim} />}
          {!semSelo && item.plano && item.plano !== "D" && (
            <span
              className="rounded-full border px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-[1.5px]"
              style={{ color: tipo.cor, borderColor: hexRgba(tipo.cor, 0.45) }}
            >
              Plano {item.plano}
            </span>
          )}
          {aberto && (
            <span className="rounded-full border border-stroke px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-[1.5px] text-ink-faint">
              {aberto}
            </span>
          )}
        </div>
        <span className="text-[14.5px] font-extrabold leading-snug">{item.titulo}</span>
      </div>

      {item.quem && (
        <div
          className="flex flex-col gap-1.5 rounded-[13px] border px-3 py-2.5"
          style={{ borderColor: hexRgba(tipo.cor, 0.35), background: hexRgba(tipo.cor, 0.09) }}
        >
          <span className="text-[9.5px] font-extrabold uppercase tracking-[2.5px]" style={{ color: tipo.cor }}>
            {ROTULO_QUEM[item.tipo] ?? "Quem"}
          </span>
          <div className="flex items-center gap-2.5">
            {rostos.length > 0 && rostos.length <= 6 && (
              <span className="flex shrink-0">
                {rostos.map((p, n) => (
                  <Avatar
                    key={p.id}
                    a={avatarDaPessoa(p, ctx.indices.get(p.id) ?? 0)}
                    size={26}
                    className={`border-[1.5px] border-night-mid ${n > 0 ? "-ml-[7px]" : ""}`}
                  />
                ))}
              </span>
            )}
            <span className="text-[13.5px] font-extrabold leading-snug text-ink">{item.quem}</span>
          </div>
        </div>
      )}

      {item.local && (
        <span className="flex items-start gap-1.5 text-[12px] font-bold text-ink-muted">
          <MapPinIcon width={13} height={13} className="mt-[2px] shrink-0 text-ink-faint" />
          {item.local}
        </span>
      )}
      {item.detalhe && (
        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">{item.detalhe}</p>
      )}

      {atracoes.length > 0 && (
        <div className="flex flex-col gap-2">
          {atracoes.map((a) => (
            <MiniAtracao key={a.id} a={a} criancas={ctx.criancas} />
          ))}
        </div>
      )}
      {videoProprio && (
        <ItemAtracao
          titulo={item.titulo}
          rotulo="Vídeo"
          className="flex items-center gap-3 rounded-[13px] border border-stroke bg-white/[0.04] p-2 pr-3"
          detalhe={
            <div className="shrink-0 overflow-hidden rounded-[16px] border border-stroke bg-black">
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoProprio}?rel=0&playsinline=1`}
                title={`Vídeo: ${item.titulo}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          }
        >
          <Miniatura src={`https://i.ytimg.com/vi/${videoProprio}/mqdefault.jpg`} cor={COR_PADRAO} alt={item.titulo} video />
          <span className="min-w-0 grow text-[12.5px] font-extrabold">ver o vídeo</span>
        </ItemAtracao>
      )}
    </div>
  );
}

function Miniatura({ src, cor, alt, video }: { src: string | null; cor: string; alt: string; video: boolean }) {
  return (
    <span className="relative shrink-0">
      <FotoAtracao src={src} cor={cor} alt={alt} className="h-[46px] w-[72px] rounded-[10px]" />
      {video && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[rgba(7,11,38,0.6)] text-white">
            <PlayIcon width={22} height={22} strokeWidth={1.6} />
          </span>
        </span>
      )}
    </span>
  );
}

// Atração citada no item: miniatura que abre a mesma folha da aba Atrações
// (vídeo, altura mínima, alertas, quem alcança).
function MiniAtracao({ a, criancas }: { a: Attraction; criancas: Crianca[] }) {
  const cor = PARQUE_INFO[a.parqueCode]?.cor ?? COR_PADRAO;
  const foto = fotoSrc(a);
  const temVideo = youtubeId(a.videoUrl) !== null;
  return (
    <ItemAtracao
      titulo={a.nome}
      rotulo={PARQUE_INFO[a.parqueCode]?.nome}
      className="flex items-center gap-3 rounded-[13px] border border-stroke bg-white/[0.04] p-2 pr-3"
      detalhe={<DetalheAtracao a={a} foto={foto} cor={cor} criancas={criancas} />}
    >
      <Miniatura src={foto} cor={cor} alt={a.nome} video={temVideo} />
      <span className="flex min-w-0 grow flex-col">
        <span className="truncate text-[12.5px] font-extrabold">{a.nome}</span>
        <span className="text-[11px] font-bold text-ink-faint">
          {temVideo ? "ver o vídeo" : "ver detalhes"}
          {a.alturaMinCm !== null ? ` · mínimo ${a.alturaMinCm} cm` : ""}
        </span>
      </span>
      <ChevronRightIcon width={14} height={14} className="shrink-0 text-ink-faint" />
    </ItemAtracao>
  );
}
