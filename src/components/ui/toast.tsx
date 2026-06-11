import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

export type ToastKind = 'error' | 'success' | 'info';

interface ToastState {
  message: string;
  kind: ToastKind;
  key: number;
}

interface ToastContextType {
  /** Mostra um aviso temporário no topo da tela. */
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION_MS = 3500;
const ANIMATION_MS = 220;

const KIND_COLORS: Record<ToastKind, { bg: string; text: string }> = {
  error: { bg: '#9E3D5A', text: '#fff' },
  success: { bg: COLORS.sage, text: '#fff' },
  info: { bg: COLORS.headerBg, text: COLORS.headerText },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    setToast({ message, kind, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.timing(opacity, { toValue: 1, duration: ANIMATION_MS, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: ANIMATION_MS, useNativeDriver: true }).start(() => {
        setToast(null);
      });
    }, TOAST_DURATION_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [toast, opacity]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          style={[styles.toast, { opacity, backgroundColor: KIND_COLORS[toast.kind].bg }]}
        >
          <View>
            <Text style={[styles.toastText, { color: KIND_COLORS[toast.kind].text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toast: {
    pointerEvents: 'none',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 16,
    right: 16,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 1000,
  },
  toastText: {
    fontSize: 13.5,
    fontWeight: '500',
    textAlign: 'center',
  },
});
