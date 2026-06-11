import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { COUPLE } from '@/constants/config';
import { sharedStyles } from '@/constants/shared-styles';
import { useToast } from '@/components/ui/toast';
import type { RelationshipStats } from '@/lib/relationship';
import { useCountUp } from '@/features/home/use-count-up';
import { isValidIsoDate } from '@/features/home/use-start-date';

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;

function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < MORNING_END_HOUR) return 'Bom dia';
  if (hour < AFTERNOON_END_HOUR) return 'Boa tarde';
  return 'Boa noite';
}

interface HomeHeroProps {
  stats: RelationshipStats;
  startIso: string;
  onSaveStartDate: (newIso: string) => Promise<boolean>;
  userName: string;
  /** True quando o usuário logado é a pessoa A do casal ('ela'). */
  isUserA: boolean;
}

/** Cabeçalho escuro da home: saudação, avatares e contador de dias juntos. */
export function HomeHero({ stats, startIso, onSaveStartDate, userName, isUserA }: HomeHeroProps) {
  const { showToast } = useToast();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState(startIso);
  const animatedDays = useCountUp(stats.days);

  const handleOpenEditor = useCallback(() => {
    setDateInput(startIso);
    setIsEditingDate(true);
  }, [startIso]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingDate(false);
    setDateInput(startIso);
  }, [startIso]);

  const handleSaveDate = useCallback(async () => {
    if (!isValidIsoDate(dateInput)) {
      showToast('Insira a data no formato AAAA-MM-DD (ex: 2024-12-06).', 'error');
      return;
    }
    const saved = await onSaveStartDate(dateInput);
    if (!saved) {
      showToast('Não foi possível salvar a nova data.', 'error');
      return;
    }
    setIsEditingDate(false);
  }, [dateInput, onSaveStartDate, showToast]);

  return (
    <>
      <View style={styles.darkHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>
              {userName} <Text style={styles.heartFaded}>♡</Text>
            </Text>
          </View>
          <View style={styles.avatarPair}>
            <View style={[styles.avatar, styles.avatarA, isUserA && styles.activeAvatar]}>
              <Text style={styles.avatarText}>{COUPLE.initialA}</Text>
            </View>
            <View style={[styles.avatar, styles.avatarB, !isUserA && styles.activeAvatar]}>
              <Text style={styles.avatarText}>{COUPLE.initialB}</Text>
            </View>
          </View>
        </View>

        {/* Contador de dias juntos */}
        <View style={styles.counterCard}>
          <Text style={styles.counterHeart}>♥</Text>
          <View style={styles.flex1}>
            <Text style={styles.counterNumber}>{animatedDays.toLocaleString('pt-BR')}</Text>
            <Text style={styles.counterLabel}>dias juntos</Text>
          </View>
          <View style={styles.counterNext}>
            <Text style={styles.nextLabel}>próximo</Text>
            <Text style={styles.nextValue}>Aniversário · {stats.nextIn} dias</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleOpenEditor} activeOpacity={0.7}>
            <Text style={styles.editIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Detalhamento anos / meses / dias */}
        <View style={styles.counterBreak}>
          <Text style={styles.breakItem}>
            <Text style={styles.breakNum}>{stats.years}</Text> anos
          </Text>
          <Text style={styles.breakDot}>·</Text>
          <Text style={styles.breakItem}>
            <Text style={styles.breakNum}>{stats.months}</Text> meses
          </Text>
          <Text style={styles.breakDot}>·</Text>
          <Text style={styles.breakItem}>
            <Text style={styles.breakNum}>{stats.restDays}</Text> dias
          </Text>
        </View>
      </View>

      {/* Modal de edição da data de início */}
      {isEditingDate && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Alterar Data de Namoro</Text>

            <Text style={sharedStyles.label}>Nova Data (AAAA-MM-DD)</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Ex: 2024-12-06"
              value={dateInput}
              onChangeText={setDateInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveDate}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  darkHeader: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
    marginBottom: 5,
  },
  name: {
    fontSize: 27,
    color: COLORS.headerText,
    fontStyle: 'italic',
  },
  heartFaded: { opacity: 0.7 },
  avatarPair: { flexDirection: 'row', marginTop: 2 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: COLORS.headerBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarA: { backgroundColor: '#e6b3c5', marginRight: -10, zIndex: 2 },
  avatarB: { backgroundColor: '#b3c7dd' },
  avatarText: { fontSize: 12, fontWeight: '600' },
  activeAvatar: { borderColor: COLORS.headerAccent, borderWidth: 2 },

  counterCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  counterHeart: { fontSize: 22, color: COLORS.headerAccent },
  counterNumber: {
    fontSize: 32,
    color: COLORS.headerText,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
    marginTop: 2,
  },
  counterNext: { marginLeft: 'auto', alignItems: 'flex-end' },
  nextLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
  },
  nextValue: {
    fontSize: 13,
    color: COLORS.headerAccent,
    fontWeight: '500',
    marginTop: 3,
  },
  editBtn: { padding: 6, marginLeft: 8 },
  editIcon: { fontSize: 16, color: COLORS.headerAccent },

  counterBreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  breakItem: { fontSize: 11, color: COLORS.headerSub, letterSpacing: 0.4 },
  breakNum: { fontSize: 17, color: COLORS.headerText, fontWeight: '500', marginRight: 3 },
  breakDot: { fontSize: 11, color: COLORS.headerSub, opacity: 0.5 },

  overlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(20, 10, 15, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontStyle: 'italic',
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
