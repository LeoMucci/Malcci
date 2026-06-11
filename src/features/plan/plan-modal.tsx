import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';

// Modal centralizado padrão da feature Planos: título itálico centralizado
// e par de botões lado a lado (Cancelar | ação), como no layout original.

interface PlanModalProps {
  visible: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function PlanModal({
  visible,
  title,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onCancel,
  onConfirm,
  children,
}: PlanModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[sharedStyles.modalOverlayCentered, styles.overlay]}>
        <View style={[sharedStyles.modalCardCentered, styles.card]}>
          <Text style={[sharedStyles.modalTitle, styles.title]}>{title}</Text>
          {children}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[sharedStyles.secondaryBtn, styles.rowBtn]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={sharedStyles.secondaryBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sharedStyles.primaryBtn, styles.rowBtn]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={sharedStyles.primaryBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 19,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rowBtn: {
    flex: 1,
    marginTop: 0,
  },
});

// Estilos compartilhados entre as seções da feature (chips de tipo/categoria e texto vazio).
export const planFeatureStyles = StyleSheet.create({
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.headerBg,
    borderColor: COLORS.headerBg,
  },
  typeButtonText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: COLORS.headerAccent,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.muted,
    paddingVertical: 40,
    fontSize: 13,
  },
});
