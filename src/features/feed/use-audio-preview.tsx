// Player de prévia (30s) para o feed. Garante que só uma faixa toca por vez.
// Usa a prévia salva no banco (preview_url) ou busca sob demanda por título+artista.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useToast } from '@/components/ui/toast';
import { getErrorMessage } from '@/lib/errors';
import { findPreviewUrl } from '@/lib/music';

export interface PreviewRequest {
  /** Id estável da memória (para saber qual card está tocando). */
  id: string;
  track: string;
  artist: string;
  /** Prévia já conhecida (salva no banco). Se vazio, busca sob demanda. */
  previewUrl?: string | null;
}

interface AudioPreviewContextType {
  /** Id da faixa tocando agora, ou null. */
  playingId: string | null;
  /** Id da faixa carregando a prévia, ou null. */
  loadingId: string | null;
  /** Toca/pausa a faixa. Para qualquer outra que esteja tocando. */
  toggle: (request: PreviewRequest) => void;
  stop: () => void;
}

const AudioPreviewContext = createContext<AudioPreviewContextType | undefined>(undefined);

// Configura o modo de áudio uma vez (tocar mesmo no silencioso, no nativo).
let audioModeConfigured = false;
function ensureAudioMode(): void {
  if (audioModeConfigured || Platform.OS === 'web') {
    audioModeConfigured = true;
    return;
  }
  audioModeConfigured = true;
  void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    // sem áudio em silencioso não é crítico
  });
}

export function AudioPreviewProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const teardownPlayer = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {
        // player já liberado
      }
      playerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    requestSeqRef.current += 1; // invalida buscas em voo
    abortRef.current?.abort();
    abortRef.current = null;
    teardownPlayer();
    setPlayingId(null);
    setLoadingId(null);
  }, [teardownPlayer]);

  // Para tudo ao desmontar.
  useEffect(() => stop, [stop]);

  const toggle = useCallback((request: PreviewRequest) => {
    // Tocando esta faixa → pausa.
    if (playingId === request.id) {
      stop();
      return;
    }

    // Troca de faixa: para a atual e inicia a nova.
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;
    abortRef.current?.abort();
    teardownPlayer();
    setPlayingId(null);

    ensureAudioMode();

    const startWith = (url: string) => {
      if (seq !== requestSeqRef.current) return; // pedido substituído
      if (!url) {
        setLoadingId(null);
        showToast('Não encontrei a prévia dessa música 😢', 'error');
        return;
      }
      try {
        const player = createAudioPlayer({ uri: url });
        playerRef.current = player;
        subscriptionRef.current = player.addListener('playbackStatusUpdate', status => {
          if (status.didJustFinish) stop();
        });
        player.play();
        setLoadingId(null);
        setPlayingId(request.id);
      } catch (err) {
        setLoadingId(null);
        showToast(getErrorMessage(err, 'Não foi possível tocar a música.'), 'error');
      }
    };

    if (request.previewUrl) {
      startWith(request.previewUrl);
      return;
    }

    // Busca a prévia sob demanda.
    setLoadingId(request.id);
    const controller = new AbortController();
    abortRef.current = controller;
    findPreviewUrl(request.track, request.artist, controller.signal)
      .then(url => startWith(url))
      .catch(err => {
        if (seq !== requestSeqRef.current) return;
        setLoadingId(null);
        showToast(getErrorMessage(err, 'Não foi possível buscar a música.'), 'error');
      });
  }, [playingId, stop, teardownPlayer, showToast]);

  const value = useMemo<AudioPreviewContextType>(
    () => ({ playingId, loadingId, toggle, stop }),
    [playingId, loadingId, toggle, stop],
  );

  return <AudioPreviewContext.Provider value={value}>{children}</AudioPreviewContext.Provider>;
}

export function useAudioPreview(): AudioPreviewContextType {
  const context = useContext(AudioPreviewContext);
  if (context === undefined) {
    throw new Error('useAudioPreview must be used within an AudioPreviewProvider');
  }
  return context;
}
