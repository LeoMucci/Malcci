import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useToast } from '@/components/ui/toast';
import { cleanText, isNonEmpty, LIMITS } from '@/lib/validation';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_KEYS,
  ACTIVITY_DIFFICULTIES,
  ACTIVITY_DIFFICULTY_KEYS,
  type ActivityCategoryKey,
  type ActivityDifficultyKey,
} from './constants';

export interface ActivityFormInput {
  title: string;
  description: string | null;
  category: ActivityCategoryKey;
  difficulty: ActivityDifficultyKey;
  estimated_time: number | null;
}

interface ActivityFormModalProps {
  onClose: () => void;
  /** Persiste a atividade. Retorna true para fechar o formulário. */
  onSubmit: (input: ActivityFormInput) => Promise<boolean>;
}

export function ActivityFormModal({ onClose, onSubmit }: ActivityFormModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ActivityCategoryKey>('date');
  const [difficulty, setDifficulty] = useState<ActivityDifficultyKey>('medium');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const cleanTitle = cleanText(title, LIMITS.title);
    if (!isNonEmpty(cleanTitle)) return;

    let timeMin: number | null = null;
    if (isNonEmpty(time)) {
      const parsed = Number.parseInt(time.trim(), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        showToast('Duração inválida. Informe os minutos em números.', 'error');
        return;
      }
      timeMin = parsed;
    }

    setSubmitting(true);
    const saved = await onSubmit({
      title: cleanTitle,
      description: cleanText(description, LIMITS.description) || null,
      category,
      difficulty,
      estimated_time: timeMin,
    });
    setSubmitting(false);
    if (saved) onClose();
  }, [title, description, category, difficulty, time, onSubmit, onClose, showToast]);

  const isDisabled = !isNonEmpty(title) || submitting;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Sugerir Atividade</Text>

        <Text style={sharedStyles.label}>Título da Atividade</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Fazer fondue na sala, Trilha no pôr do sol..."
          value={title}
          onChangeText={setTitle}
          maxLength={LIMITS.title}
        />

        <Text style={sharedStyles.label}>Instruções/Descrição (Opcional)</Text>
        <TextInput
          style={[sharedStyles.input, styles.inputShortMultiline]}
          placeholder="Ex: Comprar chocolate belga, morangos e marshmallows..."
          multiline
          numberOfLines={2}
          value={description}
          onChangeText={setDescription}
          maxLength={LIMITS.description}
        />

        <View style={styles.row}>
          <View style={styles.rowFieldLeft}>
            <Text style={sharedStyles.label}>Duração (minutos)</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Ex: 60"
              keyboardType="numeric"
              value={time}
              onChangeText={setTime}
            />
          </View>
          <View style={styles.rowField}>
            <Text style={sharedStyles.label}>Dificuldade</Text>
            <View style={styles.diffRow}>
              {ACTIVITY_DIFFICULTY_KEYS.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.diffChip, difficulty === key && { backgroundColor: ACTIVITY_DIFFICULTIES[key].color }]}
                  onPress={() => setDifficulty(key)}
                >
                  <Text style={[styles.diffChipText, difficulty === key && styles.diffChipTextSelected]}>
                    {ACTIVITY_DIFFICULTIES[key].label.slice(0, 1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={sharedStyles.label}>Categoria</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_CATEGORY_KEYS.map(key => {
            const meta = ACTIVITY_CATEGORIES[key];
            const isSelected = category === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                onPress={() => setCategory(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextSelected]}>
                  {meta.emoji} {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalBtn, styles.saveBtn, isDisabled && styles.saveDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Sugestionar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },

  row: { flexDirection: 'row' },
  rowField: { flex: 1 },
  rowFieldLeft: { flex: 1, marginRight: 8 },
  inputShortMultiline: { minHeight: 50, textAlignVertical: 'top' },

  diffRow: { flexDirection: 'row', gap: 4, height: 40, alignItems: 'center' },
  diffChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  diffChipText: { fontSize: 11, fontWeight: 'bold', color: COLORS.muted },
  diffChipTextSelected: { color: '#fff' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  typeButton: { width: '48%', minWidth: '45%', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent, fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
