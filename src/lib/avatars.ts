// Gradientes de avatar do mockup: cada núcleo tem uma família de tons e cada
// pessoa recebe uma variação estável pela ordem em que aparece na aba Turma.

type Variant = { bg: string; text: string };

const VARIANTES: Record<string, Variant[]> = {
  pessanha: [
    { bg: "linear-gradient(135deg, #f6c453, #d98a2b)", text: "#2a1c05" },
    { bg: "linear-gradient(135deg, #ffd97a, #e8a33d)", text: "#2a1c05" },
    { bg: "linear-gradient(135deg, #f2b866, #cf8f3a)", text: "#2a1c05" },
    { bg: "linear-gradient(135deg, #efc98f, #c98a3f)", text: "#2a1c05" },
  ],
  gabi: [
    { bg: "linear-gradient(135deg, #ff9d8a, #e05f63)", text: "#401313" },
    { bg: "linear-gradient(135deg, #ff8a7a, #d1554e)", text: "#401313" },
    { bg: "linear-gradient(135deg, #ffb09e, #e0705f)", text: "#401313" },
  ],
  vitor: [{ bg: "linear-gradient(135deg, #5fd0c5, #2f9d95)", text: "#0c2f2b" }],
  mariana: [{ bg: "linear-gradient(135deg, #8fe0d6, #45aca2)", text: "#0c2f2b" }],
};

const FALLBACK: Variant = { bg: "linear-gradient(135deg, #b7a9e8, #7a63c9)", text: "#1d1550" };

// `indice` = posição da pessoa dentro do próprio núcleo (ordem da planilha).
export function avatarVariant(nucleo: string, indice: number): Variant {
  const familia = VARIANTES[nucleo];
  if (!familia || familia.length === 0) return FALLBACK;
  return familia[indice % familia.length];
}
