import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { isNonEmpty, LIMITS } from '@/lib/validation';

interface ComposeNoteModalProps {
  text: string;
  important: boolean;
  onChangeText: (value: string) => void;
  onChangeImportant: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/** Overlay de escrita de um novo recado. O pai controla o estado do formulário. */
export function ComposeNoteModal({
  text,
  important,
  onChangeText,
  onChangeImportant,
  onCancel,
  onSubmit,
}: ComposeNoteModalProps) {
  const canSubmit = isNonEmpty(text);

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Deixar um Recado</Text>

        <TextInput
          style={styles.input}
          placeholder="Escreva sua mensagem com carinho..."
          placeholderTextColor="#a69098"
          multiline
          numberOfLines={4}
          maxLength={LIMITS.message}
          value={text}
          onChangeText={onChangeText}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Marcar como Importante</Text>
            <Text style={styles.switchSub}>Aparece destacado com uma estrela</Text>
          </View>
          <Switch
            value={important}
            onValueChange={onChangeImportant}
            trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
            thumbColor={important ? COLORS.accent : '#f4f3f4'}
          />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalBtn, styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: COLORS.bg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  switchLabel: { fontSize: 13.5, fontWeight: '500', color: COLORS.text },
  switchSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveBtnDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
