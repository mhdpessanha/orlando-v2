import { readFileSync } from "fs";
import { JWT } from "google-auth-library";

let client: JWT | null = null;
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

function getClient(): JWT {
  if (client) return client;
  const path = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!;
  const creds = JSON.parse(readFileSync(path, "utf8")) as {
    client_email: string;
    private_key: string;
  };
  clientEmail = creds.client_email;
  client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return client;
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
      throw new Error(`aba/planilha não encontrada (HTTP ${status})`);
    }
    throw e;
  }
}
