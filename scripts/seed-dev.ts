// Seed LOCAL de desenvolvimento: dados de exemplo com a cara da viagem real,
// aplicados pelo mesmo pipeline do sync (validação incluída). Em produção quem
// manda é a planilha — este script nunca roda lá.
// Uso: npx tsx scripts/seed-dev.ts

import { db } from "../src/lib/db";
import { runSync } from "../src/lib/sync";

const R = ["id", "data", "dia_semana", "titulo", "parque_code", "quem", "hospedagem_noite", "early_entry", "destaque", "notas"];

const FIXTURE: Record<string, unknown[][]> = {
  Roteiro: [
    R,
    ["r01", "2027-01-07", "qui", "Embarque no Rio", "", "todos", "", "", "GIG → MCO às 21h05", "chegar ao aeroporto 17h30"],
    ["r02", "2027-01-08", "sex", "Chegada em Orlando", "", "todos", "Kidani Village", "", "savana na janela", "compras de mercado à tarde"],
    ["r03", "2027-01-09", "sab", "Animal Kingdom", "AK", "todos", "Kidani Village", "sim", "Brunch no Tusker House", ""],
    ["r04", "2027-01-10", "dom", "Magic Kingdom", "MK", "todos", "Polynesian Villas", "sim", "primeiro dia de castelo", "troca de hotel de manhã"],
    ["r05", "2027-01-11", "seg", "EPCOT", "EP", "todos", "Polynesian Villas", "8h30", "Multi Pass ativo", ""],
    ["r06", "2027-01-12", "ter", "Dia de piscina", "", "todos", "Polynesian Villas", "", "", "descanso merecido"],
    ["r07", "2027-01-13", "qua", "Hollywood Studios", "HS", "todos", "Polynesian Villas", "sim", "", ""],
    ["r08", "2027-01-14", "qui", "Magic Kingdom II", "MK", "todos", "Polynesian Villas", "", "fogos da despedida Disney", ""],
    ["r09", "2027-01-15", "sex", "EPCOT II", "EP", "todos", "Polynesian Villas", "", "", ""],
    ["r10", "2027-01-16", "sab", "Universal Studios", "USF", "todos", "Endless Summer", "", "", "troca pro lado Universal"],
    ["r11", "2027-01-17", "dom", "Islands of Adventure", "IOA", "todos", "Endless Summer", "", "Hogwarts primeira vez", ""],
    ["r12", "2027-01-18", "seg", "Epic Universe", "EPIC", "todos", "Endless Summer", "", "o parque novo", ""],
    ["r13", "2027-01-19", "ter", "Compras e descanso", "", "todos", "Endless Summer", "", "", "outlets Vineland"],
    ["r14", "2027-01-20", "qua", "Universal Studios II", "USF", "todos", "Endless Summer", "", "", ""],
    ["r15", "2027-01-21", "qui", "SeaWorld", "SW", "todos", "Casa em Kissimmee", "", "", "entrada na casa à noite"],
    ["r16", "2027-01-22", "sex", "Peppa Pig Park", "PEPPA", "Gabi, Gustavo, Lucas, Olívia, Joana", "Casa em Kissimmee", "", "dia das crianças", "adultos revezam nos outlets"],
    ["r17", "2027-01-23", "sab", "Disney Springs", "", "todos", "Casa em Kissimmee", "", "jantar de despedida", ""],
    ["r18", "2027-01-24", "dom", "Volta pro Rio", "", "todos", "", "", "MCO → GIG às 19h55", ""],
  ],
  Agenda: [
    ["id", "roteiro_id", "periodo", "ordem", "titulo", "local", "detalhe", "chip"],
    ["a01", "r03", "manha", "1", "Brunch: Tusker House", "Animal Kingdom", "personagens no café", "reserva abre em 09/11"],
    ["a02", "r03", "tarde", "1", "Kilimanjaro Safaris", "", "bicho de verdade, sem fila cedo", ""],
    ["a03", "r04", "manha", "1", "Portões 8h30", "Magic Kingdom", "foto no castelo antes da multidão", ""],
    ["a04", "r04", "noite", "1", "Fogos do castelo", "", "lugar bom: em frente ao Casey's", ""],
    ["a05", "r05", "manha", "1", "Café: 'Ohana", "Polynesian", "a passos do quarto", "reserva abre em 09/11"],
    ["a06", "r05", "manha", "2", "Early Entry no EPCOT", "", "portões 8h30 — sair do hotel 8h", ""],
    ["a07", "r05", "tarde", "1", "Almoço: Les Halles", "pavilhão da França", "boulangerie do World Showcase", ""],
    ["a08", "r05", "tarde", "2", "Multi Pass em ação", "", "3 seleções — escolhemos em 01/01", ""],
    ["a09", "r05", "noite", "1", "Jantar: Le Cellier", "pavilhão do Canadá", "steakhouse, jantar de aniversário", "reserva abre em 09/11"],
    ["a10", "r05", "noite", "2", "Fogos na lagoa", "", "show noturno pra fechar o aniversário", ""],
  ],
  Voos: [
    ["id", "grupo", "status", "trecho", "data", "voo", "origem", "destino", "saida", "chegada", "reserva", "notas"],
    ["v01", "familia", "emitido", "GIG → MCO", "2027-01-07", "LA8180", "GIG", "MCO", "21:05", "5:40", "ABC123", "conexão em Lima"],
    ["v02", "familia", "emitido", "MCO → GIG", "2027-01-24", "LA8181", "MCO", "GIG", "19:55", "9:35", "ABC123", ""],
    ["v03", "gabi", "pendente", "GIG → MCO", "2027-01-07", "", "GIG", "MCO", "", "", "", "esperando promoção de milhas"],
    ["v04", "vm", "pendente", "", "XX", "", "", "", "", "", "", "decidem em outubro"],
  ],
  Hospedagens: [
    ["id", "nome", "tipo", "checkin", "checkout", "quem", "status", "confirmacao", "notas"],
    ["h01", "Kidani Village", "resort Disney · savana", "2027-01-08", "2027-01-10", "todos", "confirmado", "KV-88291", "studio com vista pra savana"],
    ["h02", "Polynesian Villas", "resort Disney · monotrilho", "2027-01-10", "2027-01-16", "todos", "confirmado", "PV-44102", ""],
    ["h03", "Endless Summer", "resort Universal", "2027-01-16", "2027-01-21", "todos", "confirmado", "ES-73520", ""],
    ["h04", "Casa em Kissimmee", "casa com piscina", "2027-01-21", "2027-01-24", "todos", "pendente", "", "fechar até novembro"],
  ],
  Turma: [
    ["id", "nome", "nucleo", "tipo", "papel", "iniciais", "aniversario", "tagline"],
    ["p01", "Murilo", "pessanha", "adulto", "admin", "M", "1993-05-02", "o arquiteto do roteiro, na 7ª ida"],
    ["p02", "Joana", "pessanha", "adulto", "membro", "J", "1997-01-11", "faz 30 no meio da viagem"],
    ["p03", "Olívia", "pessanha", "crianca", "perfil", "O", "2020-03-15", "estreia nos parques, time princesas"],
    ["p04", "Bernardo", "pessanha", "crianca", "perfil", "B", "2023-08-20", "o caçula, com assento próprio no avião"],
    ["p05", "Gabi", "gabi", "adulto", "membro", "G", "", "a prima que topou tudo"],
    ["p06", "Gustavo", "gabi", "adulto", "membro", "Gu", "", "parceiro da Gabi em tudo"],
    ["p07", "Lucas", "gabi", "crianca", "perfil", "L", "2019-11-02", "dupla da Olívia nas filas"],
    ["p08", "Vitor", "vitor", "adulto", "membro", "V", "", "amigo de longa data do Murilo"],
    ["p09", "Mariana", "mariana", "adulto", "membro", "Ma", "", "a confirmação mais recente da turma"],
  ],
  Marcos: [
    ["id", "data", "hora", "titulo", "categoria", "status", "descricao"],
    ["m01", "2026-11-09", "", "Reservas de restaurantes", "reserva", "pendente", "janela das ADRs"],
    ["m02", "2027-01-01", "9:00", "Lightning Lane à venda", "compra", "pendente", "9h de Brasília"],
    ["m03", "2026-10-15", "", "Fechar casa de Kissimmee", "hospedagem", "pendente", ""],
    ["m04", "", "", "Ingressos Universal", "compra", "pendente", "esperando Black Friday"],
  ],
  Guia: [
    ["id", "secao", "ordem", "titulo", "conteudo"],
    ["g01", "antes de viajar", "1", "Documentos", "Passaporte válido + visto americano. Crianças: autorização de viagem se não estiverem com os dois pais."],
    ["g02", "antes de viajar", "2", "Chip de celular", "eSIM internacional resolve — contratar na semana do embarque."],
    ["g03", "no aeroporto", "1", "Imigração", "Baixar o app MPC (Mobile Passport Control) antes da fila — economiza mais de uma hora."],
    ["g04", "nos parques", "1", "Lightning Lane", "Multi Pass = 3 atrações agendadas; compramos em 01/01 às 9h de Brasília. Sem stress: o Murilo coordena."],
    ["g05", "nos parques", "2", "Calor e chuva", "Janeiro é ameno, mas capa de chuva de bolso e garrafa d'água sempre na mochila."],
  ],
  Financeiro: [
    ["id", "nucleo", "item", "moeda", "valor_total", "valor_pago", "valor_restante", "notas"],
    ["f01", "pessanha", "Voos (4 pessoas)", "BRL", "18.400,00", "18.400,00", "0", "emitidos com milhas + dinheiro"],
    ["f02", "pessanha", "Hotéis Disney", "USD", "6.850,00", "3.425,00", "3.425,00", "parcelado até novembro"],
    ["f03", "pessanha", "Ingressos Disney", "USD", "3.180,00", "3.180,00", "0", ""],
    ["f04", "gabi", "Ingressos Disney", "USD", "2.390,00", "1.195,00", "1.195,00", "metade paga"],
    ["f05", "gabi", "Voos (3 pessoas)", "BRL", "13.800,00", "0", "13.800,00", "aguardando emissão"],
    ["f06", "vitor", "Cota da casa de Kissimmee", "USD", "420,00", "0", "420,00", ""],
    ["f07", "mariana", "Cota da casa de Kissimmee", "USD", "420,00", "0", "420,00", ""],
  ],
  Magia: [
    ["id", "ordem", "tema", "texto"],
    ["mg1", "1", "castelo", "O Castelo da Cinderela tem 57 metros de altura — e nenhum tijolo: é fibra de vidro sobre uma estrutura de aço."],
    ["mg2", "2", "epcot", "A esfera do EPCOT tem 11.324 painéis de alumínio — e nenhum deles é igual ao outro."],
    ["mg3", "3", "savana", "Da janela do Kidani Village dá pra ver girafas, zebras e gnus tomando café antes de você."],
    ["mg4", "4", "monotrilho", "O monotrilho do Polynesian passa DENTRO do hotel vizinho, o Contemporary, desde 1971."],
    ["mg5", "5", "fogos", "Os fogos do Magic Kingdom acontecem todas as noites do ano — chova ou faça frio."],
    ["mg6", "6", "epic", "O Epic Universe é o primeiro parque novo de Orlando em 26 anos — e a gente vai no ano seguinte à estreia."],
  ],
};

async function main() {
  const result = await runSync("seed-dev", async (aba) => {
    const values = FIXTURE[aba];
    if (!values) throw new Error(`fixture sem a aba ${aba}`);
    return values;
  });
  if (!result.ok) {
    console.error("seed falhou:", JSON.stringify(result.abas.filter((a) => a.status === "erro")));
    process.exitCode = 1;
  }
}

main().finally(() => db.$disconnect());
