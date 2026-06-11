import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useToast } from '@/components/ui/toast';
import { sharedStyles } from '@/constants/shared-styles';
import { COLORS, RADIUS } from '@/constants/theme';
import { LIMITS } from '@/lib/validation';
import { PlanModal, planFeatureStyles } from './plan-modal';
import type { Trip, TripFormData } from './types';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatShortDate(isoDate: string, withYear: boolean): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(
    'pt-BR',
    withYear ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short' },
  );
}

interface TripsSectionProps {
  trips: Trip[];
  addModalVisible: boolean;
  onCloseAddModal: () => void;
  onAddTrip: (form: TripFormData) => Promise<boolean>;
  onToggleItem: (tripId: string | number, itemId: string | number, currentPacked: boolean) => Promise<void>;
  onAddItem: (tripId: string | number, text: string) => Promise<boolean>;
}

export function TripsSection({
  trips,
  addModalVisible,
  onCloseAddModal,
  onAddTrip,
  onToggleItem,
  onAddItem,
}: TripsSectionProps) {
  const { showToast } = useToast();

  const [formTitle, setFormTitle] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formStart, setFormStart] = useState(todayIso);
  const [formEnd, setFormEnd] = useState(todayIso);
  const [formBudget, setFormBudget] = useState('');
  const [newItemText, setNewItemText] = useState('');

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormDestination('');
    setFormBudget('');
    setFormStart(todayIso());
    setFormEnd(todayIso());
  }, []);

  const handleSubmit = useCallback(async () => {
    const ok = await onAddTrip({
      title: formTitle,
      destination: formDestination,
      startDate: formStart,
      endDate: formEnd,
      budgetText: formBudget,
    });
    if (ok) {
      onCloseAddModal();
      resetForm();
    }
  }, [onAddTrip, onCloseAddModal, resetForm, formTitle, formDestination, formStart, formEnd, formBudget]);

  const handleAddItem = useCallback(async (tripId: string | number) => {
    const ok = await onAddItem(tripId, newItemText);
    if (ok) setNewItemText('');
  }, [onAddItem, newItemText]);

  const handleOpenMap = useCallback((destination: string) => {
    const address = encodeURIComponent(destination);
    const mapUrl = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${address}`
      : `geo:0,0?q=${address}`;
    Linking.canOpenURL(mapUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(mapUrl);
        }
        return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
      })
      .catch(err => {
        console.error('Failed to open map for trip destination:', err);
        showToast('Não foi possível abrir o mapa.', 'error');
      });
  }, [showToast]);

  return (
    <View style={styles.sectionGap}>
      {trips.map(trip => (
        <View key={trip.id} style={styles.tripContainer}>
          <View style={styles.tripCard}>
            <View style={styles.tripTop}>
              <View>
                <Text style={styles.tripDest}>{trip.destination}</Text>
                <Text style={styles.tripDates}>
                  {formatShortDate(trip.startDate, false)} – {formatShortDate(trip.endDate, true)}
                </Text>
              </View>
              <Text style={styles.tripIcon}>⛰️</Text>
            </View>
            <View style={styles.tripBody}>
              {trip.description ? (
                <Text style={styles.tripDescription}>{trip.description}</Text>
              ) : null}
              <View style={styles.budgetRow}>
                <Text style={styles.tripLabel}>gasto</Text>
                <View style={styles.budgetBar}>
                  <View style={[styles.budgetFill, { width: `${trip.pct}%` }]} />
                </View>
                <Text style={styles.tripLabel}>R$ {trip.spent} / R$ {trip.budget}</Text>
              </View>

              <TouchableOpacity style={styles.mapBtn} onPress={() => handleOpenMap(trip.destination)}>
                <Text style={styles.mapBtnText}>🗺️ Rota para Destino</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Checklist da viagem */}
          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>
              🧳 O que levar ({trip.items.filter(i => i.packed).length}/{trip.items.length})
            </Text>
            {trip.items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checkRow}
                onPress={() => onToggleItem(trip.id, item.id, item.packed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.packed && styles.checkboxOn]}>
                  {item.packed && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={[styles.checkText, item.packed && styles.checkTextOn]}>{item.item}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.addCheckItemRow}>
              <TextInput
                style={styles.checkInput}
                placeholder="Adicionar item na mala..."
                value={newItemText}
                onChangeText={setNewItemText}
                maxLength={LIMITS.tripItem}
              />
              <TouchableOpacity
                style={styles.addCheckItemBtn}
                onPress={() => handleAddItem(trip.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.addCheckItemBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {trips.length === 0 && (
        <Text style={planFeatureStyles.emptyText}>
          Nenhuma viagem cadastrada ainda. Clique no "+" no topo para planejar.
        </Text>
      )}

      {/* Modal: planejar viagem */}
      <PlanModal
        visible={addModalVisible}
        title="Planejar Viagem"
        confirmLabel="Planejar"
        onCancel={onCloseAddModal}
        onConfirm={handleSubmit}
      >
        <Text style={sharedStyles.label}>Título</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Férias na Serra"
          value={formTitle}
          onChangeText={setFormTitle}
          maxLength={LIMITS.title}
        />

        <Text style={sharedStyles.label}>Destino</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Gramado, RS"
          value={formDestination}
          onChangeText={setFormDestination}
          maxLength={LIMITS.location}
        />

        <View style={styles.datesRow}>
          <View style={styles.dateCol}>
            <Text style={sharedStyles.label}>Data de Início</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="YYYY-MM-DD"
              value={formStart}
              onChangeText={setFormStart}
            />
          </View>
          <View style={styles.dateColLast}>
            <Text style={sharedStyles.label}>Data de Fim</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="YYYY-MM-DD"
              value={formEnd}
              onChangeText={setFormEnd}
            />
          </View>
        </View>

        <Text style={sharedStyles.label}>Orçamento Previsto (R$)</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: 3500"
          keyboardType="numeric"
          value={formBudget}
          onChangeText={setFormBudget}
        />
      </PlanModal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: 16 },

  tripContainer: { gap: 12, width: '100%' },
  tripCard: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  tripTop: { backgroundColor: COLORS.headerBg, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripDest: { fontSize: 22, fontStyle: 'italic', color: COLORS.headerText },
  tripDates: { fontSize: 11, color: COLORS.headerSub, marginTop: 4, letterSpacing: 0.4 },
  tripIcon: { fontSize: 24, opacity: 0.5 },
  tripBody: { padding: 14 },
  tripDescription: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 12 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tripLabel: { fontSize: 11.5, color: COLORS.muted },
  budgetBar: { flex: 1, height: 6, backgroundColor: '#efe5e7', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.accent },
  mapBtn: { backgroundColor: COLORS.accentSoft, paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  mapBtnText: { fontSize: 12, color: COLORS.accentDeep, fontWeight: 'bold' },

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
  addCheckItemBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  datesRow: { flexDirection: 'row' },
  dateCol: { flex: 1, marginRight: 8 },
  dateColLast: { flex: 1 },
});
