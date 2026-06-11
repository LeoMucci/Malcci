// Extrai uma mensagem legível de qualquer erro (Supabase, fetch, JS) para exibir ao usuário.

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object') {
    const maybe = error as { message?: unknown; error_description?: unknown; details?: unknown };
    if (typeof maybe.message === 'string' && maybe.message) return maybe.message;
    if (typeof maybe.error_description === 'string' && maybe.error_description) return maybe.error_description;
    if (typeof maybe.details === 'string' && maybe.details) return maybe.details;
  }
  return fallback;
}
