// Diálogo de confirmação reutilizável que funciona em web E nativo.
// Substitui Alert.alert (que não renderiza botões na web).
// Uso: const confirm = useConfirm(); if (await confirm({ title, message })) { ... }

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo de ação perigosa (vermelho) — para exclusões. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingState extends ConfirmOptions {
  visible: boolean;
}

const CLOSED: PendingState = { visible: false, title: '' };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PendingState>(CLOSED);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(CLOSED);
  }, []);

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setState({ ...options, visible: true });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => settle(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => settle(false)}>
          <View style={styles.card}>
            <Text style={styles.title}>{state.title}</Text>
            {!!state.message && <Text style={styles.message}>{state.message}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => settle(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>{state.cancelLabel ?? 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, state.destructive && styles.confirmDanger]}
                onPress={() => settle(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>{state.confirmLabel ?? 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx === undefined) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,10,14,0.55)', justifyContent: 'center', paddingHorizontal: 28 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 22, alignSelf: 'center', width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  message: { fontSize: 13.5, color: COLORS.muted, lineHeight: 19, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg, alignItems: 'center' },
  cancelText: { fontSize: 14.5, color: COLORS.muted, fontWeight: '500' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent, alignItems: 'center' },
  confirmDanger: { backgroundColor: COLORS.accentDeep },
  confirmText: { fontSize: 14.5, color: '#fff', fontWeight: '700' },
});
