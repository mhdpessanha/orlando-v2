// Item da Magia do dia: determinístico, vira à meia-noite de Brasília (UTC-3, sem
// horário de verão). ordem = ((dias corridos desde 2026-08-28) mod N) + 1.

const EPOCH_UTC = Date.UTC(2026, 7, 28);
const BRT_OFFSET_MS = 3 * 3_600_000;

export function magiaOrdemDoDia(totalFatos: number, agora = new Date()): number {
  if (totalFatos <= 0) return 0;
  const brt = new Date(agora.getTime() - BRT_OFFSET_MS);
  const diaAtual = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
  const dias = Math.floor((diaAtual - EPOCH_UTC) / 86_400_000);
  return ((dias % totalFatos) + totalFatos) % totalFatos + 1;
}
