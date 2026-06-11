// Tipos de UI da feature Planos (camelCase) e mapeadores das rows do Supabase.
// Em modo local (sem Supabase) os ids podem ser strings geradas no cliente.

import type { CalendarEventRow, MovieRow, TripItemRow, TripRow } from '@/types/domain';

export type PlanTab = 'calendar' | 'trips' | 'movies';

export type EventCategory = 'birthday' | 'anniversary' | 'special' | 'reminder';
export type MovieKind = 'movie' | 'series';

export interface CalendarEvent {
  id: string | number;
  title: string;
  description?: string | null;
  eventDate: string;
  category: EventCategory;
}

export interface Movie {
  id: string | number;
  title: string;
  type: MovieKind;
  rating?: number | null;
  watched: boolean;
  watchedDate?: string | null;
  notes?: string | null;
}

export interface TripItem {
  id: string | number;
  tripId: string | number;
  item: string;
  packed: boolean;
}

export interface Trip {
  id: string | number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  pct: number;
  items: TripItem[];
  description?: string | null;
}

/** Payload do formulário de evento (validado em use-plan-data antes do insert). */
export interface EventFormData {
  title: string;
  eventDate: string;
  category: EventCategory;
}

/** Payload do formulário de viagem. `budgetText` é texto cru do input numérico. */
export interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetText: string;
}

export interface MovieFormData {
  title: string;
  type: MovieKind;
}

export const EVENT_CATEGORY_EMOJI: Record<EventCategory, string> = {
  anniversary: '💕',
  birthday: '🎂',
  special: '⭐',
  reminder: '📌',
};

const EVENT_CATEGORIES: readonly string[] = ['birthday', 'anniversary', 'special', 'reminder'];

function toEventCategory(value: string | null): EventCategory {
  return value !== null && EVENT_CATEGORIES.includes(value) ? (value as EventCategory) : 'special';
}

function toMovieKind(value: string): MovieKind {
  return value === 'series' ? 'series' : 'movie';
}

/**
 * Row de trips com a relação `items:trip_items(*)` e a coluna `description`
 * (presente no banco, mas não tipada em TripRow do domínio).
 */
export interface TripWithItemsRow extends TripRow {
  description?: string | null;
}

export function mapEventRow(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    category: toEventCategory(row.category),
  };
}

export function mapMovieRow(row: MovieRow): Movie {
  return {
    id: row.id,
    title: row.title,
    type: toMovieKind(row.type),
    rating: row.rating,
    watched: row.watched,
    watchedDate: row.watched_date,
    notes: row.notes,
  };
}

export function mapTripItemRow(row: TripItemRow): TripItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    item: row.item,
    packed: row.packed,
  };
}

export function mapTripRow(row: TripWithItemsRow): Trip {
  const spent = Number(row.spent) || 0;
  const budget = Number(row.budget) || 0;
  const pct = Math.min(100, Math.round((spent / (budget || 1)) * 100));
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget,
    spent,
    pct,
    items: (row.items ?? []).map(mapTripItemRow),
    description: row.description ?? null,
  };
}
