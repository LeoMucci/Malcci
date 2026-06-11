import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sharedStyles } from '@/constants/shared-styles';
import { COLORS, RADIUS } from '@/constants/theme';
import { LIMITS } from '@/lib/validation';
import { addMonths, buildCalendarCells, daysUntil, findNextEvent, formatDaysLeft } from './calendar-utils';
import { PlanModal, planFeatureStyles } from './plan-modal';
import { EVENT_CATEGORY_EMOJI, type CalendarEvent, type EventCategory, type EventFormData } from './types';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const CATEGORY_OPTIONS: { key: EventCategory; label: string }[] = [
  { key: 'anniversary', label: 'Namoro 💕' },
  { key: 'birthday', label: 'Aniversário 🎂' },
  { key: 'special', label: 'Especial ⭐' },
  { key: 'reminder', label: 'Lembrete 📌' },
];

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

interface CalendarSectionProps {
  events: CalendarEvent[];
  addModalVisible: boolean;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onAddEvent: (form: EventFormData) => Promise<boolean>;
  onDeleteEvent: (id: string | number) => void;
}

export function CalendarSection({
  events,
  addModalVisible,
  onOpenAddModal,
  onCloseAddModal,
  onAddEvent,
  onDeleteEvent,
}: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(todayIso);
  const [formCategory, setFormCategory] = useState<EventCategory>('special');

  const cells = useMemo(() => buildCalendarCells(currentDate, events), [currentDate, events]);
  const nextEvent = useMemo(() => findNextEvent(events), [events]);
  const monthLabel = useMemo(
    () => currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [currentDate],
  );
  const selectedDateEvents = useMemo(
    () => (selectedDate ? events.filter(e => e.eventDate === selectedDate) : []),
    [events, selectedDate],
  );

  const todayKey = new Date().toDateString();

  const changeMonth = useCallback((delta: number) => {
    setCurrentDate(prev => addMonths(prev, delta));
  }, []);

  const handleDayPress = useCallback((dateStr: string) => {
    const hasEventsOnDay = events.some(e => e.eventDate === dateStr);
    if (hasEventsOnDay) {
      setSelectedDate(dateStr);
      return;
    }
    setFormDate(dateStr);
    setFormTitle('');
    onOpenAddModal();
  }, [events, onOpenAddModal]);

  const handleSubmit = useCallback(async () => {
    const ok = await onAddEvent({ title: formTitle, eventDate: formDate, category: formCategory });
    if (ok) {
      onCloseAddModal();
      setFormTitle('');
    }
  }, [onAddEvent, onCloseAddModal, formTitle, formDate, formCategory]);

  const handleNewEventFromDate = useCallback(() => {
    if (!selectedDate) return;
    setFormDate(selectedDate);
    setFormTitle('');
    setSelectedDate(null);
    onOpenAddModal();
  }, [selectedDate, onOpenAddModal]);

  const handleDeleteFromDateModal = useCallback((id: string | number) => {
    onDeleteEvent(id);
    setSelectedDate(null);
  }, [onDeleteEvent]);

  return (
    <View style={styles.sectionGap}>
      {/* Grade do calendário */}
      <View style={styles.calCard}>
        <View style={styles.calMonth}>
          <Text style={styles.calMonthText}>{monthLabel}</Text>
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.calGrid}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text key={`dl-${i}`} style={styles.calDl}>{label}</Text>
          ))}
          {cells.map((cell, i) => {
            const isToday = todayKey === new Date(`${cell.dateStr}T12:00:00`).toDateString();
            return (
              <TouchableOpacity
                key={`day-${i}`}
                style={[styles.calDay, !cell.currentMonth && styles.calDayOther, isToday && styles.calDayToday]}
                onPress={() => handleDayPress(cell.dateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.calDayText,
                    !cell.currentMonth && styles.calDayTextOther,
                    isToday && styles.calDayTextToday,
                  ]}
                >
                  {cell.day}
                </Text>
                {cell.hasEvents && (
                  <View style={[styles.calDot, { backgroundColor: isToday ? '#fff' : COLORS.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Próximo evento */}
      {nextEvent && (
        <View style={styles.eventUp}>
          <View style={styles.evDate}>
            <Text style={styles.evMonth}>
              {new Date(`${nextEvent.eventDate}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
            </Text>
            <Text style={styles.evDay}>{new Date(`${nextEvent.eventDate}T12:00:00`).getDate()}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.evLabel}>próximo evento</Text>
            <Text style={styles.evName} numberOfLines={1}>{nextEvent.title}</Text>
          </View>
          <View style={styles.evBadge}>
            <Text style={styles.evBadgeText}>{formatDaysLeft(daysUntil(nextEvent.eventDate))}</Text>
          </View>
        </View>
      )}

      {/* Lista de todas as datas */}
      <Text style={styles.secLabel}>Todas as datas marcadas</Text>
      {events.map(ev => (
        <View key={ev.id} style={styles.eventListCard}>
          <Text style={styles.eventEmoji}>{EVENT_CATEGORY_EMOJI[ev.category]}</Text>
          <View style={styles.flex1}>
            <Text style={styles.eventListTitle}>{ev.title}</Text>
            <Text style={styles.eventListSub}>
              {new Date(`${ev.eventDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onDeleteEvent(ev.id)} activeOpacity={0.7}>
            <Text style={styles.delIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}
      {events.length === 0 && (
        <Text style={planFeatureStyles.emptyText}>
          Nenhum evento adicionado ainda. Clique no "+" no topo para cadastrar.
        </Text>
      )}

      {/* Modal: adicionar evento */}
      <PlanModal
        visible={addModalVisible}
        title="Adicionar Data Especial"
        confirmLabel="Adicionar"
        onCancel={onCloseAddModal}
        onConfirm={handleSubmit}
      >
        <Text style={sharedStyles.label}>Título</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Nossa primeira viagem..."
          value={formTitle}
          onChangeText={setFormTitle}
          maxLength={LIMITS.title}
        />

        <Text style={sharedStyles.label}>Data</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="YYYY-MM-DD"
          value={formDate}
          onChangeText={setFormDate}
        />

        <Text style={sharedStyles.label}>Categoria</Text>
        <View style={planFeatureStyles.typeGrid}>
          {CATEGORY_OPTIONS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[planFeatureStyles.typeButton, formCategory === cat.key && planFeatureStyles.typeButtonSelected]}
              onPress={() => setFormCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  planFeatureStyles.typeButtonText,
                  formCategory === cat.key && planFeatureStyles.typeButtonTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PlanModal>

      {/* Modal: eventos do dia selecionado */}
      <PlanModal
        visible={selectedDate !== null}
        title={
          selectedDate
            ? `Eventos de ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
            : ''
        }
        confirmLabel="Novo Evento"
        cancelLabel="Fechar"
        onCancel={() => setSelectedDate(null)}
        onConfirm={handleNewEventFromDate}
      >
        <ScrollView style={styles.dateEventsList}>
          {selectedDateEvents.map(ev => (
            <View key={ev.id} style={[styles.eventListCard, styles.dateEventCard]}>
              <Text style={styles.eventEmoji}>{EVENT_CATEGORY_EMOJI[ev.category]}</Text>
              <View style={[styles.flex1, styles.dateEventTitle]}>
                <Text style={styles.eventListTitle}>{ev.title}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteFromDateModal(ev.id)}>
                <Text style={styles.delIconDanger}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </PlanModal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: 16 },
  flex1: { flex: 1 },

  calCard: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14 },
  calMonth: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonthText: { fontSize: 18, fontStyle: 'italic', color: COLORS.text, textTransform: 'capitalize' },
  monthNavRow: { flexDirection: 'row', gap: 20 },
  monthNavBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  monthNavText: { color: COLORS.muted, fontSize: 18, fontWeight: 'bold' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDl: { width: '14.28%', textAlign: 'center', fontSize: 10, color: '#bca7ad', fontWeight: '500', paddingBottom: 4 },
  calDay: { width: '14.28%', aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  calDayOther: { opacity: 0.4 },
  calDayToday: { backgroundColor: COLORS.accent, borderRadius: 8 },
  calDayText: { fontSize: 12.5, color: COLORS.text },
  calDayTextOther: { color: '#d7c9cd' },
  calDayTextToday: { color: '#fff', fontWeight: '600' },
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
  eventEmoji: { fontSize: 18 },
  eventListTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  eventListSub: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  delIcon: { fontSize: 13, color: '#c9b0b8' },
  delIconDanger: { fontSize: 13, color: '#ff4d4f' },

  dateEventsList: { maxHeight: 200, marginBottom: 16 },
  dateEventCard: { marginBottom: 8, borderWidth: 0, backgroundColor: COLORS.bg },
  dateEventTitle: { marginLeft: 8 },
});
