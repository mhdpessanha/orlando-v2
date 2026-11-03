import { readFileSync } from "fs";
import { JWT } from "google-auth-library";

// Aba (ou planilha) não encontrada — o sync trata abas opcionais como vazias.
export class AbaNaoEncontrada extends Error {}

let client: JWT | null = null;
let escritor: JWT | null = null;
let clientEmail = "";

// Devolve o motivo se o sync não tiver como rodar (env/arquivo faltando); null = tudo certo.
export function sheetsIndisponivel(): string | null {
  if (!process.env.CMS_SHEET_ID) return "CMS_SHEET_ID não definido";
  const path = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  if (!path) return "GOOGLE_SHEETS_CREDENTIALS_PATH não definido";
  try {
    getClient();
  } catch (e) {
    return `credenciais ilegíveis em ${path}: ${e instanceof Error ? e.message : String(e)}`;
  }
  return null;
}

function lerCredenciais() {
  const path = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!;
  const creds = JSON.parse(readFileSync(path, "utf8")) as {
    client_email: string;
    private_key: string;
  };
  clientEmail = creds.client_email;
  return creds;
}

function getClient(): JWT {
  if (client) return client;
  const creds = lerCredenciais();
  client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return client;
}

// Escrita: só a exceção da altura das crianças (ver salvarAlturaAction). O resto
// do site nunca escreve na planilha.
function getEscritor(): JWT {
  if (escritor) return escritor;
  const creds = lerCredenciais();
  escritor = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return escritor;
}

// 0 → A, 25 → Z, 26 → AA
export function letraColuna(indice: number): string {
  let n = indice + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Grava um valor numa célula (A1), como digitado à mão sem conversão (RAW).
export async function escreverCelula(aba: string, celula: string, valor: string | number): Promise<void> {
  const sheetId = process.env.CMS_SHEET_ID;
  const range = `${aba}!${celula}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  try {
    await getEscritor().request({ url, method: "PUT", data: { range, values: [[valor]] } });
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      throw new Error(`403 do Google — ${clientEmail} precisa ser Editor da planilha pra salvar`);
    }
    throw e;
  }
}

export async function fetchTab(aba: string): Promise<unknown[][]> {
  const sheetId = process.env.CMS_SHEET_ID;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(aba)}`;
  try {
    const res = await getClient().request<{ values?: unknown[][] }>({ url });
    return res.data.values ?? [];
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      throw new Error(
        `403 do Google — a planilha provavelmente não está compartilhada como leitor com ${clientEmail}`,
      );
    }
    if (status === 400 || status === 404) {
      throw new AbaNaoEncontrada(`aba/planilha não encontrada (HTTP ${status})`);
    }
    throw e;
  }
}
