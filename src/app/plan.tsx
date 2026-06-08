import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Modal, Platform, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { MOVIES as MOCK_MOVIES, TRIP as MOCK_TRIP } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

interface CalendarEvent {
  id: string | number;
  title: string;
  description?: string;
  eventDate: string;
  category: 'birthday' | 'anniversary' | 'special' | 'reminder';
}

interface Movie {
  id: string | number;
  title: string;
  type: 'movie' | 'series';
  rating?: number | null;
  watched: boolean;
  watchedDate?: string | null;
  notes?: string | null;
}

interface Trip {
  id: string | number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  pct: number;
  items: TripItem[];
  description?: string;
}

interface TripItem {
  id: string | number;
  trip_id: string | number;
  item: string;
  packed: boolean;
}

export default function PlanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'trips' | 'movies'>('calendar');
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // Data states
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [movieFilter, setMovieFilter] = useState<'pending' | 'watched'>('pending');

  // Modals controllers
  const [activeModal, setActiveModal] = useState<'event' | 'trip' | 'movie' | 'watch' | null>(null);

  // Form states (Events)
  const [formEventTitle, setFormEventTitle] = useState('');
  const [formEventDate, setFormEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEventCat, setFormEventCat] = useState<'birthday' | 'anniversary' | 'special' | 'reminder'>('special');

  // Form states (Trips)
  const [formTripTitle, setFormTripTitle] = useState('');
  const [formTripDest, setFormTripDest] = useState('');
  const [formTripStart, setFormTripStart] = useState(new Date().toISOString().split('T')[0]);
  const [formTripEnd, setFormTripEnd] = useState(new Date().toISOString().split('T')[0]);
  const [formTripBudget, setFormTripBudget] = useState('');

  // Form states (Checklist item)
  const [newTripItemText, setNewTripItemText] = useState('');

  // Form states (Movies)
  const [formMovieTitle, setFormMovieTitle] = useState('');
  const [formMovieType, setFormMovieType] = useState<'movie' | 'series'>('movie');

  // Form states (Watch movie confirmation)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [formWatchRating, setFormWatchRating] = useState(5);
  const [formWatchNotes, setFormWatchNotes] = useState('');

  // Movie search text
  const [movieSearchText, setMovieSearchText] = useState('');

  // Selected date events modal
  const [selectedDateForEvents, setSelectedDateForEvents] = useState<string | null>(null);

  // Calendar logic
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Check Supabase configurations
  useEffect(() => {
    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
    setIsConfigured(!!(isUrlConfigured && isKeyConfigured));
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    if (!isConfigured) {
      // Local fallbacks
      setMovies(MOCK_MOVIES.map(m => ({
        id: m.id,
        title: m.name,
        type: m.type === 'Filme' ? 'movie' : 'series',
        rating: m.stars || null,
        watched: m.done,
        watchedDate: m.date || null,
        notes: m.note || null,
      })));

      const mockItems: TripItem[] = MOCK_TRIP.check.map(t => ({
        id: t.id,
        trip_id: 1,
        item: t.label,
        packed: t.ok,
      }));

      setTrips([{
        id: 1,
        title: 'Férias de Inverno',
        destination: MOCK_TRIP.dest,
        startDate: '2026-07-10',
        endDate: '2026-07-15',
        budget: 3500,
        spent: 1190,
        pct: MOCK_TRIP.pct,
        items: mockItems,
      }]);

      setEvents([
        { id: 1, title: 'Aniversário de namoro 💕', eventDate: '2026-06-26', category: 'anniversary' },
        { id: 2, title: 'Show no Ibira ⭐', eventDate: '2026-06-14', category: 'special' }
      ]);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Calendar Events
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsData) {
        setEvents(eventsData.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          eventDate: e.event_date,
          category: e.category,
        })));
      }

      // 2. Fetch Movies
      const { data: moviesData } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (moviesData) {
        setMovies(moviesData.map(m => ({
          id: m.id,
          title: m.title,
          type: m.type,
          rating: m.rating,
          watched: m.watched,
          watchedDate: m.watched_date,
          notes: m.notes,
        })));
      }

      // 3. Fetch Trips & Trip Items
      const { data: tripsData } = await supabase
        .from('trips')
        .select(`
          *,
          items:trip_items(*)
        `)
        .order('start_date', { ascending: true });

      if (tripsData) {
        setTrips(tripsData.map(t => {
          const spent = Number(t.spent) || 0;
          const budget = Number(t.budget) || 1;
          const pct = Math.min(100, Math.round((spent / budget) * 100));
          return {
            id: t.id,
            title: t.title,
            destination: t.destination,
            startDate: t.start_date,
            endDate: t.end_date,
            budget: t.budget,
            spent: t.spent,
            pct,
            items: t.items || [],
            description: t.description,
          };
        }));
      }
    } catch (e) {
      console.error('Failed to load plans data from Supabase:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isConfigured]);

  // Calendar grids computations
  const getCalendarCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const cells: { day: number; currentMonth: boolean; dateStr: string; hasEvents: boolean }[] = [];
    
    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const mStr = String(month === 0 ? 12 : month).padStart(2, '0');
      const yStr = String(month === 0 ? year - 1 : year);
      cells.push({
        day: d,
        currentMonth: false,
        dateStr: `${yStr}-${mStr}-${String(d).padStart(2, '0')}`,
        hasEvents: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.eventDate === dateStr);
      cells.push({
        day: d,
        currentMonth: true,
        dateStr,
        hasEvents: dayEvents.length > 0,
      });
    }

    // Next month padding
    const remaining = 42 - cells.length; // standard 6-row grid
    for (let d = 1; d <= remaining; d++) {
      const mStr = String(month === 11 ? 1 : month + 2).padStart(2, '0');
      const yStr = String(month === 11 ? year + 1 : year);
      cells.push({
        day: d,
        currentMonth: false,
        dateStr: `${yStr}-${mStr}-${String(d).padStart(2, '0')}`,
        hasEvents: false,
      });
    }

    return cells;
  };

  // Next event countdown
  const getNextEvent = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = events
      .map(e => ({ ...e, parsedDate: new Date(e.eventDate + 'T00:00:00') }))
      .filter(e => e.parsedDate >= now)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    return upcoming.length > 0 ? upcoming[0] : null;
  };

  // Handle trip items toggle
  const toggleTripItem = async (tripId: string | number, itemId: string | number, currentPacked: boolean) => {
    if (!isConfigured) {
      setTrips(prev => prev.map(t => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: t.items.map(i => i.id === itemId ? { ...i, packed: !i.packed } : i),
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
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Add Trip item
  const handleAddTripItem = async (tripId: string | number) => {
    if (!newTripItemText.trim()) return;

    if (!isConfigured) {
      setTrips(prev => prev.map(t => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: [...t.items, { id: `item_${Date.now()}`, trip_id: tripId, item: newTripItemText, packed: false }],
        };
      }));
      setNewTripItemText('');
      return;
    }

    try {
      const { error } = await supabase
        .from('trip_items')
        .insert({
          trip_id: tripId,
          item: newTripItemText,
          packed: false,
        });

      if (error) throw error;
      setNewTripItemText('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Event Addition
  const handleAddEvent = async () => {
    if (!formEventTitle.trim()) return;

    if (!isConfigured) {
      const newEv: CalendarEvent = {
        id: `ev_${Date.now()}`,
        title: formEventTitle,
        eventDate: formEventDate,
        category: formEventCat,
      };
      setEvents([...events, newEv]);
      setActiveModal(null);
      setFormEventTitle('');
      return;
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: formEventTitle,
          event_date: formEventDate,
          category: formEventCat,
        });

      if (error) throw error;

      await sendNotification(
        user!.id,
        'special_date',
        `${user!.displayName} adicionou um evento! 📅`,
        `Evento: "${formEventTitle}" em ${new Date(formEventDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
      );

      setActiveModal(null);
      setFormEventTitle('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Trip Addition
  const handleAddTrip = async () => {
    if (!formTripTitle.trim() || !formTripDest.trim()) return;

    const budgetVal = Number(formTripBudget) || 0;

    if (!isConfigured) {
      const newTr: Trip = {
        id: `tr_${Date.now()}`,
        title: formTripTitle,
        destination: formTripDest,
        startDate: formTripStart,
        endDate: formTripEnd,
        budget: budgetVal,
        spent: 0,
        pct: 0,
        items: [],
      };
      setTrips([...trips, newTr]);
      setActiveModal(null);
      resetTripForm();
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .insert({
          title: formTripTitle,
          destination: formTripDest,
          start_date: formTripStart,
          end_date: formTripEnd,
          budget: budgetVal,
          spent: 0,
        });

      if (error) throw error;

      await sendNotification(
        user!.id,
        'special_date',
        `${user!.displayName} planejou uma nova viagem! ✈️`,
        `Viagem para ${formTripDest}: "${formTripTitle}"`
      );

      setActiveModal(null);
      resetTripForm();
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const resetTripForm = () => {
    setFormTripTitle('');
    setFormTripDest('');
    setFormTripBudget('');
    setFormTripStart(new Date().toISOString().split('T')[0]);
    setFormTripEnd(new Date().toISOString().split('T')[0]);
  };

  // CRUD Movie Addition
  const handleAddMovie = async () => {
    if (!formMovieTitle.trim()) return;

    if (!isConfigured) {
      const newMv: Movie = {
        id: `mv_${Date.now()}`,
        title: formMovieTitle,
        type: formMovieType,
        watched: false,
      };
      setMovies([newMv, ...movies]);
      setActiveModal(null);
      setFormMovieTitle('');
      return;
    }

    try {
      const { error } = await supabase
        .from('movies')
        .insert({
          title: formMovieTitle,
          type: formMovieType,
          watched: false,
        });

      if (error) throw error;

      await sendNotification(
        user!.id,
        'suggestion',
        `${user!.displayName} sugeriu assistir algo! 🎬`,
        `Sugeriu: "${formMovieTitle}"`
      );

      setActiveModal(null);
      setFormMovieTitle('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Movie Watch Save
  const handleSaveWatchMovie = async () => {
    if (!selectedMovie) return;

    const todayStr = new Date().toISOString().split('T')[0];

    if (!isConfigured) {
      setMovies(prev => prev.map(m => {
        if (m.id !== selectedMovie.id) return m;
        return {
          ...m,
          watched: true,
          rating: formWatchRating,
          notes: formWatchNotes,
          watchedDate: todayStr,
        };
      }));
      setActiveModal(null);
      setSelectedMovie(null);
      setFormWatchNotes('');
      return;
    }

    try {
      const { error } = await supabase
        .from('movies')
        .update({
          watched: true,
          rating: formWatchRating,
          notes: formWatchNotes || null,
          watched_date: todayStr,
        })
        .eq('id', selectedMovie.id);

      if (error) throw error;

      await sendNotification(
        user!.id,
        'suggestion',
        `${user!.displayName} marcou um título como assistido! 🍿`,
        `Assistiram "${selectedMovie.title}". Nota: ${formWatchRating}/5`
      );

      setActiveModal(null);
      setSelectedMovie(null);
      setFormWatchNotes('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id: string | number) => {
    Alert.alert('Deletar Evento', 'Deseja realmente apagar esta data importante?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          if (!isConfigured) {
            setEvents(prev => prev.filter(e => e.id !== id));
            return;
          }
          try {
            const { error } = await supabase.from('calendar_events').delete().eq('id', id);
            if (error) throw error;
            loadData();
          } catch (e) {
            console.error('Failed to delete event:', e);
          }
        }
      }
    ]);
  };

  const handleDeleteMovie = async (id: string | number) => {
    Alert.alert('Deletar Filme/Série', 'Deseja realmente apagar esta sugestão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          if (!isConfigured) {
            setMovies(prev => prev.filter(m => m.id !== id));
            return;
          }
          try {
            const { error } = await supabase.from('movies').delete().eq('id', id);
            if (error) throw error;
            loadData();
          } catch (e) {
            console.error('Failed to delete movie:', e);
          }
        }
      }
    ]);
  };

  const handleDayClick = (dateStr: string) => {
    const dayEvents = events.filter(e => e.eventDate === dateStr);
    if (dayEvents.length > 0) {
      setSelectedDateForEvents(dateStr);
    } else {
      setFormEventDate(dateStr);
      setFormEventTitle('');
      setActiveModal('event');
    }
  };

  // Change Calendar Months
  const changeMonth = (direction: 'prev' | 'next') => {
    const d = new Date(currentDate);
    if (direction === 'prev') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  // Filtered movies listing
  const filteredMovies = movies
    .filter(m => movieFilter === 'watched' ? m.watched : !m.watched)
    .filter(m => {
      if (!movieSearchText.trim()) return true;
      return m.title.toLowerCase().includes(movieSearchText.toLowerCase());
    });

  const nextEv = getNextEvent();
  const cells = getCalendarCells();
  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nossos planos</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => {
            if (activeTab === 'calendar') setActiveModal('event');
            else if (activeTab === 'trips') setActiveModal('trip');
            else if (activeTab === 'movies') setActiveModal('movie');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Warning local mode banner if not configured */}
      {!isConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRowContainer}>
        <View style={styles.filterRow}>
          {[
            { key: 'calendar', label: 'Calendário' },
            { key: 'trips', label: 'Viagens' },
            { key: 'movies', label: 'Filmes' },
          ].map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.filterChip, activeTab === t.key && styles.filterChipOn]}
              onPress={() => setActiveTab(t.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeTab === t.key && styles.filterTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      )}

      {!loading && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* TAB 1: CALENDAR */}
          {activeTab === 'calendar' && (
            <View style={{ gap: 16 }}>
              {/* Calendar Grid card */}
              <View style={styles.calCard}>
                <View style={styles.calMonth}>
                  <Text style={styles.calMonthText}>{monthLabel}</Text>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthNavBtn}>
                      <Text style={styles.monthNavText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthNavBtn}>
                      <Text style={styles.monthNavText}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.calGrid}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <Text key={i} style={styles.calDl}>{d}</Text>
                  ))}
                  {cells.map((c, i) => {
                    const isToday = new Date().toDateString() === new Date(c.dateStr + 'T12:00:00').toDateString();
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[
                          styles.calDay,
                          !c.currentMonth && styles.calDayOther,
                          isToday && styles.calDayToday,
                        ]}
                        onPress={() => handleDayClick(c.dateStr)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.calDayText,
                          !c.currentMonth && { color: '#d7c9cd' },
                          isToday && { color: '#fff', fontWeight: '600' },
                        ]}>{c.day}</Text>
                        {c.hasEvents && (
                          <View style={[styles.calDot, { backgroundColor: isToday ? '#fff' : COLORS.accent }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Upcoming relevant events list */}
              {nextEv && (
                <View style={styles.eventUp}>
                  <View style={styles.evDate}>
                    <Text style={styles.evMonth}>
                      {new Date(nextEv.eventDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
                    </Text>
                    <Text style={styles.evDay}>
                      {new Date(nextEv.eventDate + 'T12:00:00').getDate()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evLabel}>próximo evento</Text>
                    <Text style={styles.evName} numberOfLines={1}>{nextEv.title}</Text>
                  </View>
                  <View style={styles.evBadge}>
                    <Text style={styles.evBadgeText}>
                      {(() => {
                        const diff = new Date(nextEv.eventDate + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0);
                        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        return daysLeft === 0 ? 'é hoje! 🎂' : daysLeft === 1 ? 'amanhã!' : `${daysLeft} dias`;
                      })()}
                    </Text>
                  </View>
                </View>
              )}

              {/* All events listing */}
              <Text style={styles.secLabel}>Todas as datas marcadas</Text>
              {events.map(ev => {
                const dateObj = new Date(ev.eventDate + 'T12:00:00');
                return (
                  <View key={ev.id} style={styles.eventListCard}>
                    <Text style={{ fontSize: 18 }}>
                      {ev.category === 'anniversary' ? '💕' : ev.category === 'birthday' ? '🎂' : ev.category === 'special' ? '⭐' : '📌'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventListTitle}>{ev.title}</Text>
                      <Text style={styles.eventListSub}>{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</Text>
                    </View>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteEvent(ev.id)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 13, color: '#c9b0b8' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {events.length === 0 && (
                <Text style={styles.empty}>Nenhum evento adicionado ainda. Clique no "+" no topo para cadastrar.</Text>
              )}
            </View>
          )}

          {/* TAB 2: TRIPS */}
          {activeTab === 'trips' && (
            <View style={{ gap: 16 }}>
              {trips.map(t => (
                <View key={t.id} style={styles.tripContainer}>
                  <View style={styles.tripCard}>
                    <View style={styles.tripTop}>
                      <View>
                        <Text style={styles.tripDest}>{t.destination}</Text>
                        <Text style={styles.tripDates}>
                          {new Date(t.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – {new Date(t.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 24, opacity: 0.5 }}>⛰️</Text>
                    </View>
                    <View style={styles.tripBody}>
                      {t.description ? (
                        <Text style={{ fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 12 }}>
                          {t.description}
                        </Text>
                      ) : null}
                      <View style={[styles.budgetRow, { marginBottom: 12 }]}>
                        <Text style={styles.tripLabel}>gasto</Text>
                        <View style={styles.budgetBar}>
                          <View style={[styles.budgetFill, { width: `${t.pct}%` }]} />
                        </View>
                        <Text style={styles.tripLabel}>R$ {t.spent} / R$ {t.budget}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={{ backgroundColor: COLORS.accentSoft, paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                        onPress={() => {
                          const address = encodeURIComponent(t.destination);
                          const mapUrl = Platform.OS === 'ios'
                            ? `maps://maps.apple.com/?q=${address}`
                            : `geo:0,0?q=${address}`;
                          Linking.canOpenURL(mapUrl).then(supported => {
                            if (supported) {
                              Linking.openURL(mapUrl);
                            } else {
                              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
                            }
                          }).catch(err => {
                            console.error(err);
                          });
                        }}
                      >
                        <Text style={{ fontSize: 12, color: COLORS.accentDeep, fontWeight: 'bold' }}>🗺️ Rota para Destino</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Trip Checklist Item */}
                  <View style={styles.checklistCard}>
                    <Text style={styles.checklistTitle}>🧳 O que levar ({t.items.filter(i=>i.packed).length}/{t.items.length})</Text>
                    {t.items.map(item => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={styles.checkRow}
                        onPress={() => toggleTripItem(t.id, item.id, item.packed)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, item.packed && styles.checkboxOn]}>
                          {item.packed && <Text style={styles.checkboxTick}>✓</Text>}
                        </View>
                        <Text style={[styles.checkText, item.packed && styles.checkTextOn]}>
                          {item.item}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <View style={styles.addCheckItemRow}>
                      <TextInput
                        style={styles.checkInput}
                        placeholder="Adicionar item na mala..."
                        value={newTripItemText}
                        onChangeText={setNewTripItemText}
                      />
                      <TouchableOpacity 
                        style={styles.addCheckItemBtn} 
                        onPress={() => handleAddTripItem(t.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {trips.length === 0 && (
                <Text style={styles.empty}>Nenhuma viagem cadastrada ainda. Clique no "+" no topo para planejar.</Text>
              )}
            </View>
          )}

          {/* TAB 3: MOVIES */}
          {activeTab === 'movies' && (
            <View style={{ gap: 16 }}>
              {/* Segments Toggle */}
              <View style={styles.segmentRow}>
                <TouchableOpacity 
                  style={[styles.segmentBtn, movieFilter === 'pending' && styles.segmentBtnOn]}
                  onPress={() => setMovieFilter('pending')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, movieFilter === 'pending' && styles.segmentTextOn]}>Para Assistir</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.segmentBtn, movieFilter === 'watched' && styles.segmentBtnOn]}
                  onPress={() => setMovieFilter('watched')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, movieFilter === 'watched' && styles.segmentTextOn]}>Assistidos</Text>
                </TouchableOpacity>
              </View>

              {/* Search input */}
              <View style={{ paddingHorizontal: 2, marginBottom: 4 }}>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.sm,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: COLORS.text,
                    backgroundColor: COLORS.surface
                  }}
                  placeholder="🔍 Buscar filme ou série por nome..."
                  placeholderTextColor="#a69098"
                  value={movieSearchText}
                  onChangeText={setMovieSearchText}
                />
              </View>

              {/* Movies list */}
              {filteredMovies.map(f => (
                <View key={f.id} style={styles.movieCardContainer}>
                  <View style={styles.movieCard}>
                    {/* Watch toggle */}
                    {!f.watched ? (
                      <TouchableOpacity 
                        style={styles.movieCheck} 
                        onPress={() => {
                          setSelectedMovie(f);
                          setActiveModal('watch');
                        }}
                        activeOpacity={0.7}
                      />
                    ) : (
                      <View style={[styles.movieCheck, styles.movieCheckDone]}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                      </View>
                    )}
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.movieName, f.watched && { color: COLORS.muted }]}>{f.title}</Text>
                      {f.watched && f.rating ? (
                        <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
                          {Array.from({ length: f.rating }).map((_, i) => (
                            <Text key={i} style={{ fontSize: 11, color: '#ffd479' }}>★</Text>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.movieType}>
                      <Text style={styles.movieTypeText}>
                        {f.type === 'movie' ? 'Filme' : 'Série'}
                      </Text>
                    </View>

                    <TouchableOpacity style={[styles.delBtn, { marginLeft: 10 }]} onPress={() => handleDeleteMovie(f.id)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 13, color: '#c9b0b8' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Render review note if watched */}
                  {f.watched && f.notes ? (
                    <View style={styles.movieReviewNote}>
                      <Text style={styles.movieReviewLabel}>Opinião do casal:</Text>
                      <Text style={styles.movieReviewText}>"{f.notes}"</Text>
                    </View>
                  ) : null}
                </View>
              ))}

              {filteredMovies.length === 0 && (
                <Text style={styles.empty}>Nenhum filme nesta lista ainda.</Text>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {/* MODAL 1: ADD EVENT */}
      {activeModal === 'event' && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Adicionar Data Especial</Text>
            
            <Text style={styles.modalLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Nossa primeira viagem..."
              value={formEventTitle}
              onChangeText={setFormEventTitle}
            />

            <Text style={styles.modalLabel}>Data</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={formEventDate}
              onChangeText={setFormEventDate}
            />

            <Text style={styles.modalLabel}>Categoria</Text>
            <View style={styles.typeGrid}>
              {[
                { k: 'anniversary', label: 'Namoro 💕' },
                { k: 'birthday', label: 'Aniversário 🎂' },
                { k: 'special', label: 'Especial ⭐' },
                { k: 'reminder', label: 'Lembrete 📌' }
              ].map(cat => (
                <TouchableOpacity
                  key={cat.k}
                  style={[styles.typeButton, formEventCat === cat.k && styles.typeButtonSelected]}
                  onPress={() => setFormEventCat(cat.k as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeButtonText, formEventCat === cat.k && styles.typeButtonTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setActiveModal(null)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddEvent} activeOpacity={0.7}>
                <Text style={styles.saveBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL 2: ADD TRIP */}
      {activeModal === 'trip' && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Planejar Viagem</Text>

            <Text style={styles.modalLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Férias na Serra"
              value={formTripTitle}
              onChangeText={setFormTripTitle}
            />

            <Text style={styles.modalLabel}>Destino</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Gramado, RS"
              value={formTripDest}
              onChangeText={setFormTripDest}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalLabel}>Data de Início</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  value={formTripStart}
                  onChangeText={setFormTripStart}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Data de Fim</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  value={formTripEnd}
                  onChangeText={setFormTripEnd}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Orçamento Previsto (R$)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 3500"
              keyboardType="numeric"
              value={formTripBudget}
              onChangeText={setFormTripBudget}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setActiveModal(null)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddTrip} activeOpacity={0.7}>
                <Text style={styles.saveBtnText}>Planejar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL 3: ADD MOVIE */}
      {activeModal === 'movie' && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sugerir Filme/Série</Text>

            <Text style={styles.modalLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Oppenheimer"
              value={formMovieTitle}
              onChangeText={setFormMovieTitle}
            />

            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.typeGrid}>
              {[
                { k: 'movie', label: '🎬 Filme' },
                { k: 'series', label: '📺 Série' }
              ].map(t => (
                <TouchableOpacity
                  key={t.k}
                  style={[styles.typeButton, formMovieType === t.k && styles.typeButtonSelected, { minWidth: '45%' }]}
                  onPress={() => setFormMovieType(t.k as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeButtonText, formMovieType === t.k && styles.typeButtonTextSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setActiveModal(null)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddMovie} activeOpacity={0.7}>
                <Text style={styles.saveBtnText}>Sugerir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL 4: WATCH MOVIE SAVING NOTE */}
      {activeModal === 'watch' && selectedMovie && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Marcar como Assistido</Text>
            <Text style={styles.watchLabel}>{selectedMovie.title}</Text>

            <Text style={styles.modalLabel}>Avaliação (1-5 estrelas)</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setFormWatchRating(star)} activeOpacity={0.7}>
                  <Text style={{ fontSize: 32, color: star <= formWatchRating ? '#ffd479' : COLORS.border }}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>O que acharam?</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="O filme foi bom? Algum comentário sobre?"
              multiline
              numberOfLines={3}
              value={formWatchNotes}
              onChangeText={setFormWatchNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => {
                  setActiveModal(null);
                  setSelectedMovie(null);
                  setFormWatchNotes('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveWatchMovie} activeOpacity={0.7}>
                <Text style={styles.saveBtnText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MODAL: selectedDateForEvents details */}
      {selectedDateForEvents && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Eventos de {new Date(selectedDateForEvents + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </Text>
            
            <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
              {events.filter(e => e.eventDate === selectedDateForEvents).map(ev => (
                <View key={ev.id} style={[styles.eventListCard, { marginBottom: 8, borderWidth: 0, backgroundColor: COLORS.bg }]}>
                  <Text style={{ fontSize: 18 }}>
                    {ev.category === 'anniversary' ? '💕' : ev.category === 'birthday' ? '🎂' : ev.category === 'special' ? '⭐' : '📌'}
                  </Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.eventListTitle}>{ev.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.delBtn} onPress={() => {
                    handleDeleteEvent(ev.id);
                    setSelectedDateForEvents(null);
                  }}>
                    <Text style={{ fontSize: 13, color: '#ff4d4f' }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setSelectedDateForEvents(null)} 
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Fechar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={() => {
                  const dateStr = selectedDateForEvents;
                  setSelectedDateForEvents(null);
                  setFormEventDate(dateStr);
                  setFormEventTitle('');
                  setActiveModal('event');
                }} 
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Novo Evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },

  warningBanner: {
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(199, 154, 58, 0.2)',
  },
  warningText: {
    fontSize: 10.5,
    color: COLORS.gold,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },

  filterRowContainer: { backgroundColor: COLORS.bg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipOn: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12.5, color: COLORS.muted },
  filterTextOn: { color: COLORS.headerAccent },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 30 },

  calCard: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14 },
  calMonth: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonthText: { fontSize: 18, fontStyle: 'italic', color: COLORS.text, textTransform: 'capitalize' },
  monthNavBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  monthNavText: { color: COLORS.muted, fontSize: 18, fontWeight: 'bold' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDl: { width: '14.28%', textAlign: 'center', fontSize: 10, color: '#bca7ad', fontWeight: '500', paddingBottom: 4 },
  calDay: { width: '14.28%', aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  calDayOther: { opacity: 0.4 },
  calDayToday: { backgroundColor: COLORS.accent, borderRadius: 8 },
  calDayText: { fontSize: 12.5, color: COLORS.text },
  calDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2 },

  eventUp: {
    backgroundColor: COLORS.headerBg, borderRadius: RADIUS.md,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  evDate: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11, alignItems: 'center', minWidth: 50 },
  evMonth: { fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.headerAccent },
  evDay: { fontSize: 24, color: COLORS.headerText, fontWeight: '600' },
  evLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.headerSub },
  evName: { fontSize: 16, fontStyle: 'italic', color: COLORS.headerText, marginTop: 2 },
  evBadge: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
  evBadgeText: { fontSize: 10.5, color: COLORS.headerAccent, fontWeight: '500' },

  secLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#b59aa1', marginTop: 10 },
  
  eventListCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface,
    borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12,
  },
  eventListTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  eventListSub: { fontSize: 11, color: COLORS.muted, marginTop: 3 },

  /* Trips tab styles */
  tripContainer: { gap: 12, width: '100%' },
  tripCard: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  tripTop: { backgroundColor: COLORS.headerBg, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripDest: { fontSize: 22, fontStyle: 'italic', color: COLORS.headerText },
  tripDates: { fontSize: 11, color: COLORS.headerSub, marginTop: 4, letterSpacing: 0.4 },
  tripBody: { padding: 14 },
  budgetRow: { flexDirection: 'row', alignItems: 'center' },
  tripLabel: { fontSize: 11.5, color: COLORS.muted },
  budgetBar: { flex: 1, height: 6, backgroundColor: '#efe5e7', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.accent },
  
  checklistCard: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, gap: 10 },
  checklistTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkboxTick: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  checkText: { fontSize: 13, color: COLORS.text },
  checkTextOn: { color: COLORS.muted, textDecorationLine: 'line-through' },
  addCheckItemRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  checkInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, backgroundColor: COLORS.bg },
  addCheckItemBtn: { backgroundColor: COLORS.headerBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, justifyContent: 'center' },

  /* Movies Tab Styles */
  segmentRow: { flexDirection: 'row', backgroundColor: '#efe5e7', borderRadius: 20, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: 'center' },
  segmentBtnOn: { backgroundColor: COLORS.surface },
  segmentText: { fontSize: 12.5, color: COLORS.muted, fontWeight: '500' },
  segmentTextOn: { color: COLORS.text, fontWeight: '600' },
  
  movieCardContainer: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  movieCard: {
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11,
  },
  movieCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, cursor: 'pointer' },
  movieCheckDone: { backgroundColor: COLORS.sage, borderColor: COLORS.sage, alignItems: 'center', justifyContent: 'center' },
  movieName: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1 },
  movieType: { backgroundColor: COLORS.accentSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  movieTypeText: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.muted },
  movieReviewNote: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 8 },
  movieReviewLabel: { fontSize: 10.5, fontWeight: '600', color: COLORS.accentDeep, marginBottom: 2 },
  movieReviewText: { fontSize: 12.5, fontStyle: 'italic', color: '#7a646a' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 13 },

  /* Modals Layout Styles */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 16, backgroundColor: COLORS.bg, width: '100%' },
  row: { flexDirection: 'row' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeButton: { flex: 1, minWidth: '45%', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  watchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 14, textAlign: 'center' },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
