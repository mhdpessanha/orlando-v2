import { Campo, Campos, Codigo, Texto } from "@/components/Campo";
import CopyButton from "@/components/CopyButton";
import { CardExpansivel } from "@/components/Detalhe";
import { PlaneIcon } from "@/components/icons";
import { diaMes, tituloDia } from "@/lib/format";
import { getVoosPorGrupo, GRUPO_VOO_LABEL } from "@/lib/queries";

export const metadata = { title: "Voos · Orlando 2027" };

const GRUPO_COR: Record<string, string> = {
  familia: "#f6c453",
  gabi: "#ff8a7a",
  vm: "#5fd0c5",
};

type Voo = Awaited<ReturnType<typeof getVoosPorGrupo>>[number]["voos"][number];

const hora = (h: string) => h.replace(":", "h");

function StatusChip({ status }: { status: string | null }) {
  if (!status) return null;
  const emitido = /emitido|confirmado|feito/i.test(status);
  return (
    <span
      className={`rounded-full border px-2.5 py-[5px] text-[10.5px] font-extrabold uppercase ${
        emitido
          ? "border-gold/45 bg-gold/[0.14] text-gold-light"
          : "border-[rgba(255,255,255,0.15)] bg-white/[0.07] text-[#b7b5d6]"
      }`}
    >
      {status}
    </span>
  );
}

function tituloVoo(v: Voo) {
  return v.trecho ?? [v.origem, v.destino].filter(Boolean).join(" → ") ?? "trecho a definir";
}

function DetalheVoo({ v }: { v: Voo }) {
  const temAlgo =
    v.data || v.voo || v.origem || v.destino || v.saida || v.chegada || v.reserva || v.bilhete;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-ink-muted">
          {v.data ? tituloDia(v.data) : "data a definir"}
        </span>
        <StatusChip status={v.status} />
      </div>

      {(v.origem || v.destino || v.saida || v.chegada) && (
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-stroke bg-white/[0.04] p-3.5">
          <div className="flex flex-col">
            <span className="font-display text-[26px] font-semibold leading-none">
              {v.origem ?? "—"}
            </span>
            <span className="text-[11.5px] font-bold text-ink-muted">
              {v.saida ? hora(v.saida) : "—"}
            </span>
          </div>
          <div className="flex grow items-center gap-1.5 px-1">
            <span className="h-px grow bg-white/20" />
            <PlaneIcon width={16} height={16} className="text-lavanda" />
            <span className="h-px grow bg-white/20" />
          </div>
          <div className="flex flex-col items-end">
            <span className="font-display text-[26px] font-semibold leading-none">
              {v.destino ?? "—"}
            </span>
            <span className="text-[11.5px] font-bold text-ink-muted">
              {v.chegada ? hora(v.chegada) : "—"}
            </span>
          </div>
        </div>
      )}

      <Campos>
        {v.voo && <Campo label="Voo">{v.voo}</Campo>}
        {v.assentos && <Campo label="Assentos">{v.assentos}</Campo>}
        {v.bagagem && <Campo label="Bagagem">{v.bagagem}</Campo>}
      </Campos>

      {v.reserva && (
        <Codigo
          label="LOCALIZADOR"
          valor={v.reserva}
          grande
          acao={<CopyButton texto={v.reserva} label={`Copiar localizador ${v.reserva}`} />}
        />
      )}
      {v.bilhete && (
        <Codigo
          label="BILHETE"
          valor={v.bilhete}
          acao={<CopyButton texto={v.bilhete} label={`Copiar bilhete ${v.bilhete}`} />}
        />
      )}

      {v.notas && <Texto label="Notas">{v.notas}</Texto>}
      {v.detalhes && <Texto label="Detalhes">{v.detalhes}</Texto>}

      {!temAlgo && !v.notas && !v.detalhes && (
        <span className="text-[12.5px] text-ink-muted">os detalhes chegam pela planilha</span>
      )}
    </>
  );
}

export default async function VoosPage() {
  const grupos = await getVoosPorGrupo();

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Voos</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {grupos.length > 0
            ? "localizador na mão é embarque sem stress"
            : "os voos aparecem aqui após o sync da planilha"}
        </span>
      </div>

      {grupos.map(({ grupo, voos }) => (
        <section key={grupo} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-[3px] w-4 rounded-sm"
              style={{ background: GRUPO_COR[grupo] ?? "#b7a9e8" }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
              {GRUPO_VOO_LABEL[grupo] ?? grupo}
            </span>
          </div>

          {voos.map((v) => (
            <CardExpansivel
              key={v.id}
              titulo={tituloVoo(v)}
              rotulo={GRUPO_VOO_LABEL[grupo] ?? grupo}
              className="flex flex-col gap-3 rounded-card border border-stroke bg-surface p-4"
              detalhe={<DetalheVoo v={v} />}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PlaneIcon width={17} height={17} className="text-lavanda" />
                  <span className="text-[15px] font-extrabold">{tituloVoo(v)}</span>
                </div>
                <StatusChip status={v.status} />
              </div>

              <span className="text-[12.5px] font-semibold text-ink-muted">
                {[
                  v.data && diaMes(v.data),
                  v.voo,
                  v.saida && v.chegada
                    ? `${hora(v.saida)} → ${hora(v.chegada)}`
                    : v.saida && `saída ${hora(v.saida)}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "detalhes ainda na planilha"}
              </span>

              {v.reserva && (
                <Codigo
                  label="LOCALIZADOR"
                  valor={v.reserva}
                  grande
                  acao={<CopyButton texto={v.reserva} label={`Copiar localizador ${v.reserva}`} />}
                />
              )}

              {v.notas && <span className="line-clamp-2 text-[12px] text-ink-muted">{v.notas}</span>}
            </CardExpansivel>
          ))}
        </section>
      ))}
    </div>
  );
}
