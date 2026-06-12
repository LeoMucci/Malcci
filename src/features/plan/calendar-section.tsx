import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sharedStyles } from '@/constants/shared-styles';
import { COLORS, RADIUS } from '@/constants/theme';
import DatePicker from '@/components/DatePicker';
import { LIMITS } from '@/lib/validation';
import { addMonths, buildCalendarCells, daysUntil, findNextEvent, formatDaysLeft, isDateInEvent } from './calendar-utils';
import { PlanModal, planFeatureStyles } from './plan-modal';
import { EVENT_CATEGORY_EMOJI, type CalendarEvent, type EventCategory, type EventFormData } from './types';

function formatEventDateRange(eventDate: string, endDate?: string | null): string {
  const start = new Date(`${eventDate}T12:00:00`);
  const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  if (!endDate) return startStr;
  const end = new Date(`${endDate}T12:00:00`);
  const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  return `${startStr} até ${endStr}`;
}

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
  const [formEndDate, setFormEndDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('special');

  const [selectedRangeStart, setSelectedRangeStart] = useState<string | null>(null);
  const [selectedRangeEnd, setSelectedRangeEnd] = useState<string | null>(null);

  const cells = useMemo(() => buildCalendarCells(currentDate, events), [currentDate, events]);
  const nextEvent = useMemo(() => findNextEvent(events), [events]);
  const monthLabel = useMemo(
    () => currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [currentDate],
  );
  const selectedDateEvents = useMemo(
    () => (selectedDate ? events.filter(e => isDateInEvent(selectedDate, e)) : []),
    [events, selectedDate],
  );

  const todayKey = new Date().toDateString();

  const changeMonth = useCallback((delta: number) => {
    setCurrentDate(prev => addMonths(prev, delta));
  }, []);

  const handleDayPress = useCallback((dateStr: string) => {
    const hasEventsOnDay = events.some(e => isDateInEvent(dateStr, e));
    if (hasEventsOnDay) {
      setSelectedDate(dateStr);
      return;
    }
    
    if (!selectedRangeStart || (selectedRangeStart && selectedRangeEnd)) {
      setSelectedRangeStart(dateStr);
      setSelectedRangeEnd(null);
    } else {
      if (dateStr >= selectedRangeStart) {
        setSelectedRangeEnd(dateStr);
      } else {
        setSelectedRangeStart(dateStr);
        setSelectedRangeEnd(null);
      }
    }
  }, [events, selectedRangeStart, selectedRangeEnd]);

  const handleSubmit = useCallback(async () => {
    const ok = await onAddEvent({
      title: formTitle,
      eventDate: formDate,
      endDate: formEndDate.trim() || null,
      category: formCategory,
      description: formDescription.trim() || null,
    });
    if (ok) {
      onCloseAddModal();
      setFormTitle('');
      setFormEndDate('');
      setFormDescription('');
      setSelectedRangeStart(null);
      setSelectedRangeEnd(null);
    }
  }, [onAddEvent, onCloseAddModal, formTitle, formDate, formEndDate, formCategory, formDescription]);

  const handleNewEventFromDate = useCallback(() => {
    if (!selectedDate) return;
    setFormDate(selectedDate);
    setFormEndDate('');
    setFormDescription('');
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
            const isRangeStart = cell.dateStr === selectedRangeStart;
            const isRangeEnd = cell.dateStr === selectedRangeEnd;
            const isWithinRange = !!(selectedRangeStart && selectedRangeEnd && cell.dateStr > selectedRangeStart && cell.dateStr < selectedRangeEnd);

            return (
              <TouchableOpacity
                key={`day-${i}`}
                style={[
                  styles.calDay,
                  !cell.currentMonth && styles.calDayOther,
                  isToday && styles.calDayToday,
                  (isRangeStart || isRangeEnd) && styles.calDaySelected,
                  isWithinRange && styles.calDayInRange,
                ]}
                onPress={() => handleDayPress(cell.dateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.calDayText,
                    !cell.currentMonth && styles.calDayTextOther,
                    isToday && styles.calDayTextToday,
                    (isRangeStart || isRangeEnd) && styles.calDayTextSelected,
                    isWithinRange && styles.calDayTextInRange,
                  ]}
                >
                  {cell.day}
                </Text>
                {cell.hasEvents && (
                  <View style={[styles.calDot, { backgroundColor: (isToday || isRangeStart || isRangeEnd) ? '#fff' : COLORS.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Faixa de Seleção de Range */}
      {selectedRangeStart && (
        <View style={styles.rangeInfoCard}>
          <Text style={styles.rangeInfoText} numberOfLines={1}>
            📅 Selecionado: {new Date(`${selectedRangeStart}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            {selectedRangeEnd && ` até ${new Date(`${selectedRangeEnd}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
          </Text>
          <View style={styles.rangeActions}>
            <TouchableOpacity
              style={styles.rangeClearBtn}
              onPress={() => {
                setSelectedRangeStart(null);
                setSelectedRangeEnd(null);
              }}
            >
              <Text style={styles.rangeClearText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rangeConfirmBtn}
              onPress={() => {
                setFormDate(selectedRangeStart);
                setFormEndDate(selectedRangeEnd ?? '');
                setFormDescription('');
                setFormTitle('');
                onOpenAddModal();
              }}
            >
              <Text style={styles.rangeConfirmText}>Criar Evento</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              {formatEventDateRange(ev.eventDate, ev.endDate)}
            </Text>
            {!!ev.description && (
              <Text style={styles.eventListDesc}>{ev.description}</Text>
            )}
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

        <Text style={sharedStyles.label}>Data de Início</Text>
        <DatePicker
          value={formDate}
          onChange={setFormDate}
          placeholder="Selecionar data de início"
          style={{ marginBottom: 10 }}
        />

        <Text style={sharedStyles.label}>Data de Fim (opcional)</Text>
        <DatePicker
          value={formEndDate}
          onChange={setFormEndDate}
          placeholder="Sem data de fim"
          clearable
          style={{ marginBottom: 10 }}
        />

        <Text style={sharedStyles.label}>Notas / Descrição (opcional)</Text>
        <TextInput
          style={[sharedStyles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          placeholder="Ex: Reservar restaurante, detalhes do evento..."
          value={formDescription}
          onChangeText={setFormDescription}
          multiline
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
                {ev.endDate && (
                  <Text style={styles.eventListSub}>{formatEventDateRange(ev.eventDate, ev.endDate)}</Text>
                )}
                {!!ev.description && (
                  <Text style={styles.eventListDesc}>{ev.description}</Text>
                )}
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

  calDaySelected: { backgroundColor: COLORS.accent, borderRadius: 8 },
  calDayInRange: { backgroundColor: COLORS.accentSoft, borderRadius: 0 },
  calDayTextSelected: { color: '#fff', fontWeight: '600' },
  calDayTextInRange: { color: COLORS.accentDeep },

  rangeInfoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginHorizontal: 2,
    marginTop: -8,
    marginBottom: 8,
  },
  rangeInfoText: { fontSize: 12.5, color: COLORS.text, fontWeight: '500', flex: 1 },
  rangeActions: { flexDirection: 'row', gap: 6 },
  rangeClearBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: COLORS.bg },
  rangeClearText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  rangeConfirmBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: COLORS.accent },
  rangeConfirmText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  eventListDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' },
});
