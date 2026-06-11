// Cálculos de tempo de relacionamento (puro, testável).

export interface RelationshipStats {
  /** Total de dias juntos. */
  days: number;
  years: number;
  months: number;
  /** Dias além de anos+meses completos. */
  restDays: number;
  /** Dias até o próximo aniversário de namoro. */
  nextIn: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getRelationshipStats(startIso: string, today: Date = new Date()): RelationshipStats {
  const start = new Date(`${startIso}T00:00:00`);
  const diffDays = Math.floor(Math.abs(today.getTime() - start.getTime()) / MS_PER_DAY);

  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  let days = today.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const nextAnniversary = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (today > nextAnniversary) {
    nextAnniversary.setFullYear(today.getFullYear() + 1);
  }
  const nextIn = Math.ceil((nextAnniversary.getTime() - today.getTime()) / MS_PER_DAY);

  return { days: diffDays, years, months, restDays: days, nextIn };
}
