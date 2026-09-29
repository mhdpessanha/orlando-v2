import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fotoSrc } from "@/lib/atracoes";
import { PARQUE_INFO } from "@/lib/parques";
import { getAtracoes } from "@/lib/queries";
import Classificador from "../Classificador";

export const metadata = { title: "Dar nota · Orlando 2027" };

// Modo rápido: sem ?parque= abre o primeiro parque (na ordem do roteiro) com nota faltando.
export default async function ClassificarPage({
  searchParams,
}: {
  searchParams: Promise<{ parque?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { parque: parqueSel } = await searchParams;
  const { parques, parque, itens, criancas } = await getAtracoes(session.userId, parqueSel);
  if (!parque) redirect("/roteiro/atracoes");

  const i = parques.findIndex((p) => p.code === parque.code);
  const depois = [...parques.slice(i + 1), ...parques.slice(0, i)].find((p) => p.minhas < p.total);
  const nome = (code: string) => PARQUE_INFO[code]?.nome ?? code;

  return (
    <Classificador
      key={parque.code}
      parque={{ code: parque.code, nome: nome(parque.code), cor: PARQUE_INFO[parque.code]?.cor ?? "#b7a9e8" }}
      itens={itens.map((it) => ({ a: it.atracao, foto: fotoSrc(it.atracao) }))}
      notasIniciais={Object.fromEntries(
        itens.flatMap((it) => (it.minhaNota !== null ? [[it.atracao.id, it.minhaNota]] : [])),
      )}
      criancas={criancas}
      proximo={depois ? { code: depois.code, nome: nome(depois.code), faltam: depois.total - depois.minhas } : null}
    />
  );
}
