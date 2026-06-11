// Fallbacks locais da feature Planos: mantêm o app utilizável sem credenciais
// do Supabase, reaproveitando os mocks de @/constants/data.

import { MOVIES as MOCK_MOVIES, TRIP as MOCK_TRIP } from '@/constants/data';
import type { CalendarEvent, Movie, Trip, TripItem } from './types';

export function buildMockMovies(): Movie[] {
  return MOCK_MOVIES.map(m => ({
    id: m.id,
    title: m.name,
    type: m.type === 'Filme' ? 'movie' : 'series',
    rating: m.stars || null,
    watched: m.done,
    watchedDate: 'date' in m && typeof m.date === 'string' ? m.date : null,
    notes: m.note || null,
  }));
}

export function buildMockTrips(): Trip[] {
  const items: TripItem[] = MOCK_TRIP.check.map(t => ({
    id: t.id,
    tripId: 1,
    item: t.label,
    packed: t.ok,
  }));

  return [{
    id: 1,
    title: 'Férias de Inverno',
    destination: MOCK_TRIP.dest,
    startDate: '2026-07-10',
    endDate: '2026-07-15',
    budget: 3500,
    spent: 1190,
    pct: MOCK_TRIP.pct,
    items,
  }];
}

export function buildMockEvents(): CalendarEvent[] {
  return [
    { id: 1, title: 'Aniversário de namoro 💕', eventDate: '2026-06-26', category: 'anniversary' },
    { id: 2, title: 'Show no Ibira ⭐', eventDate: '2026-06-14', category: 'special' },
  ];
}
