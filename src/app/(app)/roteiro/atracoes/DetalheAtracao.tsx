import type { ReactNode } from "react";
import type { Attraction } from "@prisma/client";
import { Campo, Campos, Texto } from "@/components/Campo";
import { ExternalIcon } from "@/components/icons";
import {
  alturaM,
  criancasNaAltura,
  parseAlertas,
  tipoLabel,
  trocaLabel,
  youtubeId,
  type Crianca,
} from "@/lib/atracoes";
import FotoAtracao from "./FotoAtracao";

// Chips de alerta (molha, escuro, pode assustar…)
export function Alertas({ alertas }: { alertas: string | null }) {
  const lista = parseAlertas(alertas);
  if (lista.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {lista.map((t) => (
        <span
          key={t}
          className="rounded-full border border-[rgba(255,255,255,0.14)] bg-white/[0.06] px-[9px] py-[3px] text-[10.5px] font-extrabold text-[#b7b5d6]"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// Cada criança: pode / não pode / falta medir (altura da Turma × altura mínima)
function Criancas({ a, criancas }: { a: Attraction; criancas: Crianca[] }) {
  const r = criancasNaAltura(a.alturaMinCm, criancas);
  if (r.livre) {
    return <Campo label="Crianças">sem altura mínima — dá pra ir todo mundo junto</Campo>;
  }
  const chip = (c: Crianca, estado: "pode" | "nao" | "medir") => (
    <span
      key={c.nome}
      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold ${
        estado === "pode"
          ? "border-[rgba(95,191,122,0.5)] bg-[rgba(95,191,122,0.14)] text-[#8fdca5]"
          : estado === "nao"
            ? "border-nucleo-gabi/50 bg-nucleo-gabi/[0.12] text-nucleo-gabi"
            : "border-stroke bg-white/[0.05] text-ink-faint"
      }`}
    >
      {c.nome} · {estado === "pode" ? "pode" : estado === "nao" ? "não pode" : "medir"}
    </span>
  );
  return (
    <Campo label="Crianças">
      <div className="flex flex-col gap-2">
        {criancas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.podem.map((c) => chip(c, "pode"))}
            {r.naoPodem.map((c) => chip(c, "nao"))}
            {r.semMedida.map((c) => chip(c, "medir"))}
          </div>
        )}
        <span className="text-[12.5px] font-semibold leading-relaxed text-ink-muted">
          {r.semMedida.length > 0 && "As crianças vão ser medidas em dezembro (de tênis). "}
          Quem não tiver a altura espera com um adulto e depois troca — é o {trocaLabel(a.parqueCode)}, sem
          pegar a fila duas vezes.
        </span>
      </div>
    </Campo>
  );
}

// Conteúdo da folha de uma atração. Sem estado: serve na página (server) e no
// modo rápido (client). `nota` = botões da minha nota; `children` = notas da família.
export default function DetalheAtracao({
  a,
  foto,
  cor,
  criancas,
  nota,
  children,
}: {
  a: Attraction;
  foto: string | null;
  cor: string;
  criancas: Crianca[];
  nota?: ReactNode;
  children?: ReactNode;
}) {
  const video = youtubeId(a.videoUrl);
  return (
    <>
      {video ? (
        // shrink-0: dentro da folha rolável, bloco com overflow-hidden encolheria até sumir
        <div className="shrink-0 overflow-hidden rounded-[16px] border border-stroke bg-black">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${video}?rel=0&playsinline=1`}
            title={`Vídeo: ${a.nome}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        foto && <FotoAtracao src={foto} cor={cor} alt={a.nome} className="aspect-video w-full rounded-[16px]" />
      )}

      {a.descricao && <p className="text-[14px] leading-relaxed text-ink">{a.descricao}</p>}
      <Alertas alertas={a.alertas} />

      {nota}

      <Campos>
        <Campo label="Tipo">{tipoLabel(a.tipo) ?? "—"}</Campo>
        <Campo label="Área">{a.area ?? "—"}</Campo>
        <Campo label="Altura mínima">{a.alturaMinCm !== null ? alturaM(a.alturaMinCm) : "não tem"}</Campo>
        <Campo label="Duração">{a.duracaoMin !== null ? `~${a.duracaoMin} min` : "—"}</Campo>
      </Campos>
      {a.filaRapida && <Campo label="Fila rápida">{a.filaRapida}</Campo>}
      <Criancas a={a} criancas={criancas} />
      {a.detalhes && <Texto label="Pra saber">{a.detalhes}</Texto>}

      {children}

      {video && (
        <a
          href={`https://www.youtube.com/watch?v=${video}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-lavanda"
        >
          abrir o vídeo no YouTube
          <ExternalIcon width={13} height={13} />
        </a>
      )}
    </>
  );
}
