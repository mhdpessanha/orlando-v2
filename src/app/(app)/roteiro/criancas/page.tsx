import { redirect } from "next/navigation";
import { agoraOrlando } from "@/lib/format";
import { getDiaPadraoDoPlano } from "@/lib/queries";
import AbasRoteiro from "../AbasRoteiro";

export const metadata = { title: "Plano das crianças · Orlando 2027" };
export const dynamic = "force-dynamic";

// Entrada do plano das crianças: abre no dia de hoje durante a viagem e no
// primeiro dia com plano antes dela.
export default async function PlanoCriancasEntrada() {
  const id = await getDiaPadraoDoPlano(agoraOrlando().data);
  if (id) redirect(`/roteiro/${id}/criancas`);
  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Plano das crianças</h1>
        <AbasRoteiro ativa="criancas" />
      </div>
      <div className="rounded-card border border-stroke bg-surface px-4 py-[15px] text-[13px] text-ink-muted">
        O plano hora a hora aparece aqui depois do sync da planilha.
      </div>
    </div>
  );
}
