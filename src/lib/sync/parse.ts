// Parsing bruto das abas: valores da API do Sheets → objetos por cabeçalho.

export class TabError extends Error {}

// Convenção da planilha: XX, XXXXXX ou [PREENCHER] = "falta preencher" = vazio
const EMPTY_RE = /^(x{2,}|\[preencher\])$/i;

export function normCell(v: unknown): string {
  const s = String(v ?? "").trim();
  return EMPTY_RE.test(s) ? "" : s;
}

// Linha 1 é o contrato: cabeçalho esperado ausente → a aba inteira falha.
// Cabeçalhos opcionais (colunas novas, ex.: detalhes de voo) viram "" quando
// ainda não existem na aba. Colunas extras desconhecidas são ignoradas.
// Linhas 100% vazias são puladas.
export function rowsToObjects(
  values: unknown[][],
  headersEsperados: readonly string[],
  headersOpcionais: readonly string[] = [],
): { obj: Record<string, string>; linha: number }[] {
  if (values.length === 0) throw new TabError("aba vazia (sem linha de cabeçalho)");
  const headers = (values[0] ?? []).map((h) => String(h ?? "").trim());
  const faltando = headersEsperados.filter((h) => !headers.includes(h));
  if (faltando.length > 0) {
    throw new TabError(`cabeçalho ausente: ${faltando.join(", ")}`);
  }
  const todos = [...headersEsperados, ...headersOpcionais];
  const idx = new Map(todos.map((h) => [h, headers.indexOf(h)]));

  const out: { obj: Record<string, string>; linha: number }[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const obj: Record<string, string> = {};
    let temAlgo = false;
    for (const h of todos) {
      const col = idx.get(h)!;
      const cell = col < 0 ? "" : normCell(row[col]);
      obj[h] = cell;
      if (cell !== "") temAlgo = true;
    }
    if (temAlgo) out.push({ obj, linha: i + 1 });
  }
  return out;
}

// Números podem vir formatados do Sheets: "1.234,56", "1234.56", "R$ 350,00"…
export function parseNumeroBR(s: string): number {
  let t = s.replace(/[^\d.,-]/g, "");
  if (/,\d{1,2}$/.test(t)) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  } else {
    t = t.replace(/,/g, "");
  }
  return Number(t);
}
