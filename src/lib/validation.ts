// Limites e helpers de validação de entrada do usuário.
// Toda entrada deve passar por cleanText antes de ir para o banco.

export const LIMITS = {
  title: 80,
  description: 1000,
  comment: 300,
  message: 500,
  diaryEntry: 2000,
  pollQuestion: 140,
  pollOption: 60,
  location: 120,
  url: 500,
  tripItem: 80,
} as const;

/** Remove espaços nas pontas e corta no limite. Retorna string vazia se só houver espaço. */
export function cleanText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/** Converte texto de preço ("R$ 1.234,56" ou "1234.56") em número, ou null se inválido. */
export function parsePrice(value: string): number | null {
  const normalized = value.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  if (!normalized || !/\d/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Valida URL http(s). */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Valida data no formato YYYY-MM-DD. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}
