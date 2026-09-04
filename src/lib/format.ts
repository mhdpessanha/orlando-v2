// Datas da planilha são strings AAAA-MM-DD; tudo aqui trabalha sobre elas
// sem criar Date com timezone local (parse sempre como UTC).

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_CURTOS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function parseISO(data: string): Date {
  return new Date(`${data}T00:00:00Z`);
}

// "2027-01-11" → "Segunda, 11 de janeiro"
export function tituloDia(data: string): string {
  const d = parseISO(data);
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

// "2027-01-11" → "11 de janeiro"
export function diaMes(data: string): string {
  const d = parseISO(data);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

export function diaNumero(data: string): string {
  return String(parseISO(data).getUTCDate()).padStart(2, "0");
}

export function diaSemanaCurto(data: string): string {
  return DIAS_CURTOS[parseISO(data).getUTCDay()];
}

// "2027-01-11" → "11/01"
export function ddmm(data: string): string {
  const d = parseISO(data);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Data-base "hoje" no fuso de Brasília (UTC-3, sem horário de verão), como AAAA-MM-DD.
export function hojeBrasilia(agora = new Date()): string {
  const brt = new Date(agora.getTime() - 3 * 3_600_000);
  return brt.toISOString().slice(0, 10);
}

// Dias corridos de hoje (Brasília) até a data. 0 = hoje; negativo = passou.
export function diasAte(data: string, agora = new Date()): number {
  return Math.round((parseISO(data).getTime() - parseISO(hojeBrasilia(agora)).getTime()) / 86_400_000);
}

export function chipPrazo(data: string): string {
  const d = diasAte(data);
  if (d === 0) return "é hoje";
  if (d === 1) return "amanhã";
  if (d < 0) return "feito?";
  return `em ${d} dias`;
}

// Aniversário na planilha pode ser "AAAA-MM-DD" ou "DD/MM" (sem ano).
// Normaliza pra "MM-DD" pra comparar com datas do roteiro.
export function aniversarioMD(aniv: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(aniv)) return aniv.slice(5);
  const m = aniv.match(/^(\d{2})\/(\d{2})$/);
  return m ? `${m[2]}-${m[1]}` : null;
}

export function aniversarioAno(aniv: string): number | null {
  return /^\d{4}-/.test(aniv) ? Number(aniv.slice(0, 4)) : null;
}

export function aniversarioDdmm(aniv: string): string {
  return /^\d{2}\/\d{2}$/.test(aniv) ? aniv : ddmm(aniv);
}

// aniversário cai no mesmo dia/mês da data do roteiro?
export function mesmoDiaMes(aniv: string, data: string): boolean {
  return aniversarioMD(aniv) === data.slice(5);
}

// "2027-01-10", "2027-01-16" → "de 10 a 16 de janeiro"
export function periodoEstadia(checkin: string | null, checkout: string | null): string | null {
  if (!checkin || !checkout) return null;
  const a = parseISO(checkin);
  const b = parseISO(checkout);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `de ${a.getUTCDate()} a ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}`;
  }
  return `de ${diaMes(checkin)} a ${diaMes(checkout)}`;
}

export function moeda(valor: number, moedaCode: string | null): string {
  const symbol = moedaCode === "USD" ? "US$" : "R$";
  return `${symbol} ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
