import { StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

// Estilos compartilhados entre telas (modais, inputs, botões).
// Antes duplicados em plan/feed/index/wishlist.

export const sharedStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 10, 14, 0.55)',
    justifyContent: 'flex-end',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(20, 10, 14, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '88%',
  },
  modalCardCentered: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 14,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: COLORS.muted,
    marginBottom: 6,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
});
