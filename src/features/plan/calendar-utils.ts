// Funções puras da grade do calendário (testáveis e memoizáveis via useMemo).

import type { CalendarEvent } from './types';

export interface CalendarCell {
  day: number;
  currentMonth: boolean;
  dateStr: string;
  hasEvents: boolean;
}

/** Grade fixa de 6 semanas (42 células), como no layout original. */
const CALENDAR_GRID_SIZE = 42;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Formata ano/mês(0-indexado)/dia como YYYY-MM-DD.
 * O construtor de Date normaliza overflow (mês -1 → dezembro do ano anterior,
 * mês 12 → janeiro do ano seguinte), o que torna a virada jan/dez à prova de erro.
 */
export function toIsoDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayStr}`;
}

/**
 * Avança/retrocede meses sem o bug de overflow do dia 31:
 * `setMonth` em 31/jan pulava fevereiro (31/jan + 1 mês = "31/fev" = 3/mar).
 * Fixar o dia 1 garante navegação correta em qualquer virada de mês/ano.
 */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Monta as 42 células do mês visível, com padding dos meses vizinhos. */
export function buildCalendarCells(currentDate: Date, events: readonly CalendarEvent[]): CalendarCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexado

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const eventDates = new Set(events.map(e => e.eventDate));
  const cells: CalendarCell[] = [];

  // Padding do mês anterior (month - 1 é normalizado pelo Date em toIsoDate)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({
      day,
      currentMonth: false,
      dateStr: toIsoDate(year, month - 1, day),
      hasEvents: false,
    });
  }

  // Dias do mês atual
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toIsoDate(year, month, day);
    cells.push({
      day,
      currentMonth: true,
      dateStr,
      hasEvents: eventDates.has(dateStr),
    });
  }

  // Padding do próximo mês (month + 1 também é normalizado)
  const remaining = CALENDAR_GRID_SIZE - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      day,
      currentMonth: false,
      dateStr: toIsoDate(year, month + 1, day),
      hasEvents: false,
    });
  }

  return cells;
}

/** Próximo evento de hoje em diante, ou null se não houver. */
export function findNextEvent(events: readonly CalendarEvent[]): CalendarEvent | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .map(event => ({ event, time: new Date(`${event.eventDate}T00:00:00`).getTime() }))
    .filter(entry => entry.time >= today.getTime())
    .sort((a, b) => a.time - b.time);

  return upcoming.length > 0 ? upcoming[0].event : null;
}

/** Dias (inteiros, arredondados para cima) até a data ISO informada. */
export function daysUntil(isoDate: string): number {
  const diff = new Date(`${isoDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / MS_PER_DAY);
}

/** Texto do badge de contagem regressiva (mesmas strings do layout original). */
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return 'é hoje! 🎂';
  if (daysLeft === 1) return 'amanhã!';
  return `${daysLeft} dias`;
}
