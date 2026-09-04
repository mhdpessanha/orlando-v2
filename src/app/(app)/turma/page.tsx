import { SparkleIcon } from "@/components/icons";
import { avatarVariant } from "@/lib/avatars";
import { aniversarioAno, aniversarioDdmm, aniversarioMD } from "@/lib/format";
import { getPessoas, indicePorNucleo, TRIP_FIM, TRIP_INICIO } from "@/lib/queries";
import type { Person } from "@prisma/client";

export const metadata = { title: "Turma · Orlando 2027" };

const SECOES: { nucleos: string[]; label: string; cor: string }[] = [
  { nucleos: ["pessanha"], label: "Família Pessanha", cor: "#f6c453" },
  { nucleos: ["gabi"], label: "Família da Gabi", cor: "#ff8a7a" },
  { nucleos: ["vitor", "mariana"], label: "Vitor & Mariana", cor: "#5fd0c5" },
];

// aniversário cai dentro da viagem? (comparação MM-DD; viagem toda em janeiro)
function fazAniversarioNaViagem(p: Person): boolean {
  if (!p.aniversario) return false;
  const md = aniversarioMD(p.aniversario);
  return md !== null && md >= TRIP_INICIO.slice(5) && md <= TRIP_FIM.slice(5);
}

export default async function TurmaPage() {
  const pessoas = await getPessoas();
  const indices = indicePorNucleo(pessoas);
  const criancas = pessoas.filter((p) => p.tipo === "crianca");
  const nucleosPresentes = new Set(pessoas.map((p) => p.nucleo));

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">A turma</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          {pessoas.length > 0
            ? `${pessoas.length} viajantes · ${nucleosPresentes.size >= 4 ? 3 : nucleosPresentes.size} núcleos · 1 contagem regressiva`
            : "a turma aparece aqui após o sync da planilha"}
        </span>
      </div>

      {SECOES.map(({ nucleos, label, cor }) => {
        const membros = pessoas.filter((p) => nucleos.includes(p.nucleo));
        if (membros.length === 0) return null;
        return (
          <section key={label} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-[3px] w-4 rounded-sm" style={{ background: cor }} />
              <span className="text-[11px] font-extrabold uppercase tracking-[2.5px] text-ink-faint">
                {label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {membros.map((p) => {
                const v = avatarVariant(p.nucleo, indices.get(p.id) ?? 0);
                const aniversariante = fazAniversarioNaViagem(p);
                const ano = p.aniversario ? aniversarioAno(p.aniversario) : null;
                const idade = ano ? 2027 - ano : null;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col items-center gap-2 rounded-card border p-[18px] pb-3.5 ${
                      aniversariante ? "border-gold/50" : "border-stroke"
                    } bg-surface`}
                  >
                    <div
                      className="flex h-[54px] w-[54px] items-center justify-center rounded-full text-[19px] font-extrabold"
                      style={{
                        background: v.bg,
                        color: v.text,
                        boxShadow: aniversariante ? "0 0 0 2px #f6c453" : undefined,
                      }}
                    >
                      {p.iniciais ?? p.nome.charAt(0)}
                    </div>
                    <span className="text-[14px] font-extrabold">{p.nome}</span>
                    {aniversariante && p.aniversario ? (
                      <span className="rounded-full border border-gold/45 bg-gold/[0.14] px-2.5 py-[3px] text-center text-[10px] font-extrabold text-gold-light">
                        {idade ? `faz ${idade} na viagem` : "aniversário na viagem"} ·{" "}
                        {aniversarioDdmm(p.aniversario)}
                      </span>
                    ) : (
                      p.tagline && (
                        <span className="text-center text-[11px] leading-snug text-ink-muted">
                          {p.tagline}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {criancas.length > 0 && (
        <div className="flex items-center gap-3.5 rounded-card border border-[rgba(143,123,255,0.4)] bg-[linear-gradient(135deg,rgba(143,123,255,0.14),rgba(87,199,216,0.1))] p-4">
          <SparkleIcon width={24} height={24} className="shrink-0 text-lavanda" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-extrabold">
              Estreia nos parques:{" "}
              {criancas.length === 1
                ? criancas[0].nome
                : `${criancas
                    .slice(0, -1)
                    .map((c) => c.nome)
                    .join(", ")} e ${criancas[criancas.length - 1].nome}`}
            </span>
            <span className="text-[12px] text-ink-muted">
              a primeira viagem deles — e o motivo de tudo isso
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
