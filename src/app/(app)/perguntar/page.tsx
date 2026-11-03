import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Chat from "./Chat";

export const metadata = { title: "Pergunte · Orlando 2027" };

export default async function PerguntarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;

  const sugestoes = [
    "Que parque a gente vai no dia 14?",
    "Qual o localizador do meu voo de ida?",
    "Como são os quartos de cada hospedagem?",
    user.papel === "admin" ? "Quanto falta cada núcleo pagar?" : "Quanto eu ainda devo?",
    "Quais as imperdíveis da família no Magic Kingdom?",
    "Em quais montanhas-russas a Olívia pode ir?",
  ];

  return (
    <div className="flex flex-col gap-[22px] pt-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Pergunte</h1>
        <span className="text-[13px] font-semibold text-ink-muted">
          oi, {user.name}! qualquer coisa da viagem — o assistente lê tudo o que está no site
        </span>
      </div>
      <Chat sugestoes={sugestoes} />
    </div>
  );
}
