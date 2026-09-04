import { Texto } from "@/components/Campo";
import { CardExpansivel } from "@/components/Detalhe";
import { getGuia } from "@/lib/queries";

export const metadata = { title: "Guia · Orlando 2027" };

export default async function GuiaPage() {
  const secoes = await getGuia();

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
