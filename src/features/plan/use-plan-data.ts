import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { getErrorMessage } from '@/lib/errors';
import { sendNotification } from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { LIMITS, cleanText, isNonEmpty, isValidIsoDate, parsePrice } from '@/lib/validation';
import type { CalendarEventRow, MovieRow } from '@/types/domain';
import { buildMockEvents, buildMockMovies, buildMockTrips } from './plan-mocks';
import {
  mapEventRow,
  mapMovieRow,
  mapTripRow,
  type CalendarEvent,
  type EventFormData,
  type Movie,
  type MovieFormData,
  type Trip,
  type TripFormData,
  type TripWithItemsRow,
} from './types';

const PLAN_TABLES = ['calendar_events', 'trips', 'trip_items', 'movies'] as const;

export interface PlanData {
  loading: boolean;
  events: CalendarEvent[];
  trips: Trip[];
  movies: Movie[];
  reload: () => Promise<void>;
  addEvent: (form: EventFormData) => Promise<boolean>;
  deleteEvent: (id: string | number) => void;
  addTrip: (form: TripFormData) => Promise<boolean>;
  toggleTripItem: (tripId: string | number, itemId: string | number, currentPacked: boolean) => Promise<void>;
  addTripItem: (tripId: string | number, text: string) => Promise<boolean>;
  addMovie: (form: MovieFormData) => Promise<boolean>;
  markMovieWatched: (movie: Movie, rating: number, notes: string) => Promise<boolean>;
  deleteMovie: (id: string | number) => void;
}

/**
 * Dados e mutações da tela Planos (eventos, viagens e filmes).
 * Sem Supabase configurado, opera em memória com os mocks de @/constants/data.
 */
export function usePlanData(): PlanData {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEvents(buildMockEvents());
      setTrips(buildMockTrips());
      setMovies(buildMockMovies());
      setLoading(false);
      return;
    }

    try {
      const [eventsRes, moviesRes, tripsRes] = await Promise.all([
        supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
        supabase.from('movies').select('*').order('created_at', { ascending: false }),
        supabase.from('trips').select('*, items:trip_items(*)').order('start_date', { ascending: true }),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (moviesRes.error) throw moviesRes.error;
      if (tripsRes.error) throw tripsRes.error;

      setEvents(((eventsRes.data ?? []) as CalendarEventRow[]).map(mapEventRow));
      setMovies(((moviesRes.data ?? []) as MovieRow[]).map(mapMovieRow));
      setTrips(((tripsRes.data ?? []) as TripWithItemsRow[]).map(mapTripRow));
    } catch (e) {
      console.error('Failed to load plans data from Supabase:', e);
      showToast(getErrorMessage(e, 'Não foi possível carregar os planos.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(PLAN_TABLES, reload);

  // ---------- Eventos ----------

  const addEvent = useCallback(async (form: EventFormData): Promise<boolean> => {
    const title = cleanText(form.title, LIMITS.title);
    if (!isNonEmpty(title)) {
      showToast('Dê um título para o evento.', 'error');
      return false;
    }
    if (!isValidIsoDate(form.eventDate)) {
      showToast('Data inválida. Use o formato AAAA-MM-DD.', 'error');
      return false;
    }

    if (!isSupabaseConfigured) {
      setEvents(prev => [
        ...prev,
        { id: `ev_${Date.now()}`, title, eventDate: form.eventDate, category: form.category },
      ]);
      return true;
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({ title, event_date: form.eventDate, category: form.category });
      if (error) throw error;

      if (user) {
        await sendNotification(
          user.id,
          'special_date',
          `${user.displayName} adicionou um evento! 📅`,
          `Evento: "${title}" em ${new Date(`${form.eventDate}T12:00:00`).toLocaleDateString('pt-BR')}`
        );
      }

      await reload();
      return true;
    } catch (e) {
      console.error('Failed to add calendar event:', e);
      showToast(getErrorMessage(e, 'Não foi possível adicionar o evento.'), 'error');
      return false;
    }
  }, [user, showToast, reload]);

  const deleteEvent = useCallback((id: string | number) => {
    void (async () => {
      const ok = await confirm({
        title: 'Apagar evento',
        message: 'Deseja realmente apagar esta data importante?',
        confirmLabel: 'Apagar',
        destructive: true,
      });
      if (!ok) return;
      if (!isSupabaseConfigured) {
        setEvents(prev => prev.filter(e => e.id !== id));
        return;
      }
      try {
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
        await reload();
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível apagar o evento.'), 'error');
      }
    })();
  }, [confirm, showToast, reload]);

  // ---------- Viagens ----------

  const addTrip = useCallback(async (form: TripFormData): Promise<boolean> => {
    const title = cleanText(form.title, LIMITS.title);
    const destination = cleanText(form.destination, LIMITS.location);
    if (!isNonEmpty(title) || !isNonEmpty(destination)) {
      showToast('Preencha o título e o destino da viagem.', 'error');
      return false;
    }
    if (!isValidIsoDate(form.startDate) || !isValidIsoDate(form.endDate)) {
      showToast('Datas inválidas. Use o formato AAAA-MM-DD.', 'error');
      return false;
    }
    const budget = isNonEmpty(form.budgetText) ? parsePrice(form.budgetText) : 0;
    if (budget === null) {
      showToast('Orçamento inválido. Informe apenas números.', 'error');
      return false;
    }

    if (!isSupabaseConfigured) {
      setTrips(prev => [
        ...prev,
        {
          id: `tr_${Date.now()}`,
          title,
          destination,
          startDate: form.startDate,
          endDate: form.endDate,
          budget,
          spent: 0,
          pct: 0,
          items: [],
        },
      ]);
      return true;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .insert({
          title,
          destination,
          start_date: form.startDate,
          end_date: form.endDate,
          budget,
          spent: 0,
        });
      if (error) throw error;

      if (user) {
        await sendNotification(
          user.id,
          'special_date',
          `${user.displayName} planejou uma nova viagem! ✈️`,
          `Viagem para ${destination}: "${title}"`
        );
      }

      await reload();
      return true;
    } catch (e) {
      console.error('Failed to add trip:', e);
      showToast(getErrorMessage(e, 'Não foi possível criar a viagem.'), 'error');
      return false;
    }
  }, [user, showToast, reload]);

  const toggleTripItem = useCallback(async (
    tripId: string | number,
    itemId: string | number,
    currentPacked: boolean,
  ) => {
    if (!isSupabaseConfigured) {
      setTrips(prev => prev.map(t => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: t.items.map(i => (i.id === itemId ? { ...i, packed: !i.packed } : i)),
        };
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('trip_items')
        .update({ packed: !currentPacked })
        .eq('id', itemId);
      if (error) throw error;
      await reload();
    } catch (e) {
      console.error('Failed to toggle trip item:', e);
      showToast(getErrorMessage(e, 'Não foi possível atualizar o item.'), 'error');
    }
  }, [showToast, reload]);

  const addTripItem = useCallback(async (tripId: string | number, text: string): Promise<boolean> => {
    const item = cleanText(text, LIMITS.tripItem);
    if (!isNonEmpty(item)) return false;

    if (!isSupabaseConfigured) {
      setTrips(prev => prev.map(t => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: [...t.items, { id: `item_${Date.now()}`, tripId, item, packed: false }],
        };
      }));
      return true;
    }

    try {
      const { error } = await supabase
        .from('trip_items')
        .insert({ trip_id: tripId, item, packed: false });
      if (error) throw error;
      await reload();
      return true;
    } catch (e) {
      console.error('Failed to add trip item:', e);
      showToast(getErrorMessage(e, 'Não foi possível adicionar o item.'), 'error');
      return false;
    }
  }, [showToast, reload]);

  // ---------- Filmes ----------

  const addMovie = useCallback(async (form: MovieFormData): Promise<boolean> => {
    const title = cleanText(form.title, LIMITS.title);
    if (!isNonEmpty(title)) {
      showToast('Dê um título para a sugestão.', 'error');
      return false;
    }

    if (!isSupabaseConfigured) {
      setMovies(prev => [{ id: `mv_${Date.now()}`, title, type: form.type, watched: false }, ...prev]);
      return true;
    }

    try {
      const { error } = await supabase
        .from('movies')
        .insert({ title, type: form.type, watched: false });
      if (error) throw error;

      if (user) {
        await sendNotification(
          user.id,
          'suggestion',
          `${user.displayName} sugeriu assistir algo! 🎬`,
          `Sugeriu: "${title}"`
        );
      }

      await reload();
      return true;
    } catch (e) {
      console.error('Failed to add movie:', e);
      showToast(getErrorMessage(e, 'Não foi possível adicionar a sugestão.'), 'error');
      return false;
    }
  }, [user, showToast, reload]);

  const markMovieWatched = useCallback(async (
    movie: Movie,
    rating: number,
    notes: string,
  ): Promise<boolean> => {
    const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
    const safeNotes = cleanText(notes, LIMITS.description);
    const todayStr = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured) {
      setMovies(prev => prev.map(m => {
        if (m.id !== movie.id) return m;
        return { ...m, watched: true, rating: safeRating, notes: safeNotes, watchedDate: todayStr };
      }));
      return true;
    }

    try {
      const { error } = await supabase
        .from('movies')
        .update({
          watched: true,
          rating: safeRating,
          notes: safeNotes || null,
          watched_date: todayStr,
        })
        .eq('id', movie.id);
      if (error) throw error;

      if (user) {
        await sendNotification(
          user.id,
          'suggestion',
          `${user.displayName} marcou um título como assistido! 🍿`,
          `Assistiram "${movie.title}". Nota: ${safeRating}/5`
        );
      }

      await reload();
      return true;
    } catch (e) {
      console.error('Failed to mark movie as watched:', e);
      showToast(getErrorMessage(e, 'Não foi possível salvar a avaliação.'), 'error');
      return false;
    }
  }, [user, showToast, reload]);

  const deleteMovie = useCallback((id: string | number) => {
    void (async () => {
      const ok = await confirm({
        title: 'Apagar título',
        message: 'Deseja realmente apagar esta sugestão?',
        confirmLabel: 'Apagar',
        destructive: true,
      });
      if (!ok) return;
      if (!isSupabaseConfigured) {
        setMovies(prev => prev.filter(m => m.id !== id));
        return;
      }
      try {
        const { error } = await supabase.from('movies').delete().eq('id', id);
        if (error) throw error;
        await reload();
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível apagar a sugestão.'), 'error');
      }
    })();
  }, [confirm, showToast, reload]);

  return {
    loading,
    events,
    trips,
    movies,
    reload,
    addEvent,
    deleteEvent,
    addTrip,
    toggleTripItem,
    addTripItem,
    addMovie,
    markMovieWatched,
    deleteMovie,
  };
}
