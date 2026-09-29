// Atrações: notas, rótulos e o "fator criança". Sem banco — serve client e server.

export type Nota = 0 | 1 | 2 | 3;

export const NOTAS: { valor: Nota; label: string; cor: string }[] = [
  { valor: 3, label: "Imperdível", cor: "#f6c453" },
  { valor: 2, label: "Quero muito", cor: "#b7a9e8" },
  { valor: 1, label: "Se der", cor: "#7fc8d6" },
  { valor: 0, label: "Passo", cor: "#8b89b0" },
];

export function notaInfo(nota: number) {
  return NOTAS.find((n) => n.valor === nota) ?? NOTAS[NOTAS.length - 1];
}

export function ehNota(v: unknown): v is Nota {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

const TIPO_LABEL: Record<string, string> = {
  "montanha-russa": "Montanha-russa",
  "dark-ride": "Dark ride",
  simulador: "Simulador",
  agua: "Água",
  passeio: "Passeio",
  show: "Show",
  noturno: "Show noturno",
  parada: "Parada",
  personagens: "Personagens",
  trilha: "Trilha",
};

export function tipoLabel(tipo: string | null): string | null {
  return tipo ? (TIPO_LABEL[tipo] ?? tipo) : null;
}

// 102 → "1,02 m"
export function alturaM(cm: number): string {
  return `${(cm / 100).toFixed(2).replace(".", ",")} m`;
}

export function parseAlertas(alertas: string | null): string[] {
  return (alertas ?? "").split("|").map((s) => s.trim()).filter(Boolean);
}

// Disney chama de Rider Switch; Universal (inclusive Epic) de Child Swap
export function trocaLabel(parqueCode: string): string {
  return ["USF", "IOA", "EPIC"].includes(parqueCode) ? "Child Swap" : "Rider Switch";
}

export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  );
  return m ? m[1] : null;
}

// Chave da foto: foto_url da planilha ou, sem ela, o vídeo (vira miniatura do YouTube).
export function chaveFoto(a: { fotoUrl: string | null; videoUrl: string | null }): string | null {
  return a.fotoUrl ?? (youtubeId(a.videoUrl) ? a.videoUrl : null);
}

// URL da foto servida pelo site; ?v= muda quando a origem muda (cache do navegador).
export function fotoSrc(a: { id: string; fotoUrl: string | null; videoUrl: string | null }): string | null {
  const chave = chaveFoto(a);
  if (!chave) return null;
  let h = 5381;
  for (let i = 0; i < chave.length; i++) h = ((h << 5) + h + chave.charCodeAt(i)) >>> 0;
  return `/api/atracoes/${encodeURIComponent(a.id)}/foto?v=${h.toString(36)}`;
}

// ── Fator criança: altura mínima × altura de cada criança (coluna altura_cm da Turma) ──

export type Crianca = { nome: string; alturaCm: number | null };

export function criancasNaAltura(alturaMinCm: number | null, criancas: Crianca[]) {
  if (alturaMinCm === null) {
    return { livre: true, podem: criancas, naoPodem: [] as Crianca[], semMedida: [] as Crianca[] };
  }
  return {
    livre: false,
    podem: criancas.filter((c) => c.alturaCm !== null && c.alturaCm >= alturaMinCm),
    naoPodem: criancas.filter((c) => c.alturaCm !== null && c.alturaCm < alturaMinCm),
    semMedida: criancas.filter((c) => c.alturaCm === null),
  };
}

function nomes(lista: Crianca[]): string {
  const n = lista.map((c) => c.nome);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;
}

// Frase curta pro card: "livre pra todo mundo", "Lucas pode · Bernardo não"…
export function resumoCriancas(alturaMinCm: number | null, criancas: Crianca[]): string {
  const r = criancasNaAltura(alturaMinCm, criancas);
  if (r.livre) return "sem altura mínima";
  const partes: string[] = [];
  if (criancas.length > 0 && r.semMedida.length === criancas.length) {
    return `mín. ${alturaM(alturaMinCm!)}`;
  }
  if (r.naoPodem.length === 0 && r.semMedida.length === 0) partes.push("todas as crianças podem");
  else if (r.podem.length === 0 && r.semMedida.length === 0) partes.push("nenhuma criança pode");
  else {
    if (r.podem.length > 0) partes.push(`${nomes(r.podem)} ${r.podem.length === 1 ? "pode" : "podem"}`);
    if (r.naoPodem.length > 0) partes.push(`${nomes(r.naoPodem)} não`);
    if (r.semMedida.length > 0) partes.push(`falta medir ${nomes(r.semMedida)}`);
  }
  return `mín. ${alturaM(alturaMinCm!)} · ${partes.join(" · ")}`;
}

// Alguma criança (medida) fica de fora → precisa de troca de adultos
export function precisaTroca(alturaMinCm: number | null, criancas: Crianca[]): boolean {
  return criancasNaAltura(alturaMinCm, criancas).naoPodem.length > 0;
}
