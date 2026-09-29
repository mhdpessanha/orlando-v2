import Link from "next/link";
import { Texto } from "@/components/Campo";
import { CardExpansivel } from "@/components/Detalhe";
import { BedIcon, ChevronRightIcon, PlaneIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { ddmm } from "@/lib/format";
import { getEstadias, getGuia, getIdaDoGrupo, GRUPO_DO_NUCLEO } from "@/lib/queries";

export const metadata = { title: "Guia · Orlando 2027" };

// Atalho pras páginas que não estão na nav (voos e hospedagens), com o resumo de quem está logado
function Atalho({
  href,
  icon,
  titulo,
  linhas,
}: {
  href: string;
  icon: React.ReactNode;
  titulo: string;
  linhas: (string | null)[];
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-card border border-gold/40 bg-[linear-gradient(135deg,rgba(246,196,83,0.14),rgba(246,196,83,0.03))] p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-gold/[0.14]">
          {icon}
        </div>
        <ChevronRightIcon width={15} height={15} className="text-gold-light" />
      </div>
      <span className="text-[14px] font-extrabold">{titulo}</span>
      <div className="flex flex-col">
        {linhas.filter(Boolean).map((l) => (
          <span key={l} className="text-[11.5px] leading-snug text-ink-muted">
            {l}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default async function GuiaPage() {
  const session = await getSession();
  const [secoes, ida, estadias] = await Promise.all([
    getGuia(),
    getIdaDoGrupo((session && GRUPO_DO_NUCLEO[session.user.nucleo]) ?? "familia"),
    getEstadias(),
  ]);

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Guia da viagem</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {secoes.length > 0
            ? "o que a família precisa saber, sem caça ao tesouro no grupo"
            : "o guia aparece aqui após o sync da planilha"}
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
          Na mão durante a viagem
        </span>
        <div className="grid grid-cols-2 gap-3">
          <Atalho
            href="/voos"
            icon={<PlaneIcon width={19} height={19} className="text-gold-light" />}
            titulo="Voos"
            linhas={[
              ida ? `sua ida: ${ddmm(ida.data)}${ida.saida ? ` · ${ida.saida.replace(":", "h")}` : ""}` : null,
              "localizador, bilhete e bagagem",
            ]}
          />
          <Atalho
            href="/hospedagens"
            icon={<BedIcon width={19} height={19} className="text-gold-light" />}
            titulo="Hospedagens"
            linhas={[
              `${estadias.length} ${estadias.length === 1 ? "estadia" : "estadias"}`,
              "confirmação e endereço",
            ]}
          />
        </div>
      </section>

      {secoes.map(({ secao, itens }) => (
        <section key={secao} className="flex flex-col gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
            {secao}
          </span>
          {itens.map((item) => (
            <CardExpansivel
              key={item.id}
              titulo={item.titulo}
              rotulo={secao}
              className="flex flex-col gap-1.5 rounded-card border border-stroke bg-surface p-4"
              detalhe={
                <>
                  {item.conteudo && (
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">
                      {item.conteudo}
                    </p>
                  )}
                  {item.detalhes ? (
                    <Texto label="Mais detalhes">{item.detalhes}</Texto>
                  ) : (
                    !item.conteudo && (
                      <span className="text-[12.5px] text-ink-muted">
                        ainda sem conteúdo — vem da planilha
                      </span>
                    )
                  )}
                </>
              }
            >
              <span className="text-[14px] font-extrabold">{item.titulo}</span>
              {item.conteudo && (
                <span className="line-clamp-3 text-[12.5px] leading-relaxed text-ink-muted">
                  {item.conteudo}
                </span>
              )}
            </CardExpansivel>
          ))}
        </section>
      ))}
    </div>
  );
}
