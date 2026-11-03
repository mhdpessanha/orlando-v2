import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { criancaPode, fotoSrc } from "@/lib/atracoes";
import { PARQUE_INFO } from "@/lib/parques";
import { getAtracoes, getAtracoesCriancas } from "@/lib/queries";
import Classificador from "../Classificador";

export const metadata = { title: "Dar nota · Orlando 2027" };

type ParqueProgresso = { code: string; minhas: number; total: number };

function parquesDaTrilha(parques: ParqueProgresso[]) {
  return parques.map((p) => ({
    code: p.code,
    nome: PARQUE_INFO[p.code]?.nome ?? p.code,
    cor: PARQUE_INFO[p.code]?.cor ?? "#b7a9e8",
    minhas: p.minhas,
    total: p.total,
  }));
}

// Modo rápido: sem ?parque= abre o primeiro parque (na ordem do roteiro) com nota
// faltando. Com ?crianca=, o pai/mãe dá as notas da criança (só o que ela alcança).
export default async function ClassificarPage({
  searchParams,
}: {
  searchParams: Promise<{ parque?: string; crianca?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parque: parqueSel, crianca: criancaSel } = await searchParams;

  if (criancaSel) {
    const { parques, parque, crianca, criancas, itens } = await getAtracoesCriancas(
      session.user,
      parqueSel,
      criancaSel,
    );
    // só os pais dão nota pela criança; os outros veem a lista dela
    if (!crianca || !crianca.minha || !parque) {
      redirect(
        `/roteiro/atracoes?ver=criancas${parqueSel ? `&parque=${parqueSel}` : ""}${crianca ? `&crianca=${crianca.id}` : ""}`,
      );
    }
    const alcanca = itens.filter((i) => criancaPode(i.atracao.alturaMinCm, crianca.alturaCm));
    return (
      <Classificador
        // altura nova = lista nova: remonta do zero
        key={`${parque.code}-${crianca.id}-${crianca.alturaCm ?? "sem"}`}
        parque={parque.code}
        parques={parquesDaTrilha(parques)}
        itens={alcanca.map((it) => ({ a: it.atracao, foto: fotoSrc(it.atracao) }))}
        notasIniciais={Object.fromEntries(
          alcanca.flatMap((it) => {
            const v = it.votos.find((x) => x.id === crianca.id);
            return v ? [[it.atracao.id, v.nota]] : [];
          }),
        )}
        criancas={criancas}
        crianca={{ id: crianca.id, nome: crianca.nome, a: crianca.a, alturaCm: crianca.alturaCm }}
        comAlturaMinima={crianca.alturaCm === null ? itens.length - alcanca.length : 0}
      />
    );
  }

  const { parques, parque, itens, criancas } = await getAtracoes(session.user, parqueSel);
  if (!parque) redirect("/roteiro/atracoes");

  return (
    <Classificador
      key={parque.code}
      parque={parque.code}
      parques={parquesDaTrilha(parques)}
      itens={itens.map((it) => ({ a: it.atracao, foto: fotoSrc(it.atracao) }))}
      notasIniciais={Object.fromEntries(
        itens.flatMap((it) => (it.minhaNota !== null ? [[it.atracao.id, it.minhaNota]] : [])),
      )}
      criancas={criancas}
    />
  );
}
