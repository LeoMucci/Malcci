import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { formatTrackDuration, searchTracks, type MusicTrack } from '@/lib/music';

/** Detalhes extras da faixa escolhida (prévia + capa) — opcional para retrocompat. */
export interface SelectedTrackMeta {
  previewUrl: string;
  albumArt: string;
}

interface MusicSearchProps {
  trackName: string;
  artistName: string;
  onSelect: (track: string, artist: string, meta?: SelectedTrackMeta) => void;
  onClear?: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

export default function MusicSearch({ trackName, artistName, onSelect, onClear }: MusicSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const isSelected = !!(trackName && artistName);

  const cancelPendingSearch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    requestIdRef.current += 1;
  }, []);

  // Cancela debounce e requisições em voo ao desmontar.
  useEffect(() => cancelPendingSearch, [cancelPendingSearch]);

  const searchMusic = useCallback(
    async (text: string) => {
      const trimmed = text.trim();

      if (trimmed.length < MIN_QUERY_LENGTH) {
        cancelPendingSearch();
        setResults([]);
        setShowResults(false);
        setSearchError(false);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setSearchError(false);

      try {
        const tracks = await searchTracks(trimmed, controller.signal, RESULT_LIMIT);
        if (requestId !== requestIdRef.current) return; // resposta obsoleta — ignora
        setResults(tracks);
        setShowResults(true);
      } catch (error) {
        if (requestId !== requestIdRef.current) return; // busca cancelada/substituída
        console.warn('Music search error:', getErrorMessage(error, 'falha de rede'));
        setResults([]);
        setShowResults(true);
        setSearchError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [cancelPendingSearch]
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchMusic(text), SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = (item: MusicTrack) => {
    cancelPendingSearch();
    onSelect(item.title, item.artist, { previewUrl: item.previewUrl, albumArt: item.albumArt });
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError(false);
    setLoading(false);
  };

  const handleClear = () => {
    cancelPendingSearch();
    onSelect('', '');
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError(false);
    setLoading(false);
    onClear?.();
  };

  return (
    <View style={styles.container}>
      {isSelected ? (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedInfo}>
            <Text style={{ fontSize: 15, color: '#1DB954' }}>♫</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedTrack} numberOfLines={1}>{trackName}</Text>
              <Text style={styles.selectedArtist} numberOfLines={1}>{artistName}</Text>
            </View>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.inputRow}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>🎵</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar música, artista..."
              placeholderTextColor="#a69098"
              value={query}
              onChangeText={handleChangeText}
              autoCorrect={false}
            />
            {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginLeft: 6 }} />}
          </View>

          {showResults && !searchError && results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.albumArt ? (
                    <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
                  ) : (
                    <View style={[styles.albumArt, styles.albumPlaceholder]}>
                      <Text style={{ fontSize: 14 }}>🎵</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTrack} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resultArtist} numberOfLines={1}>{item.artist}</Text>
                  </View>
                  {item.duration > 0 && (
                    <Text style={styles.resultDuration}>{formatTrackDuration(item.duration)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showResults && searchError && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Não foi possível buscar músicas — tente de novo.</Text>
            </View>
          )}

          {showResults && !searchError && results.length === 0 && !loading && query.trim().length >= MIN_QUERY_LENGTH && (
            <View style={styles.noResultsBox}>
              <Text style={styles.noResultsText}>Nenhuma música encontrada para "{query}"</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 16 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    backgroundColor: COLORS.bg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },

  resultsList: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
    maxHeight: 260,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  albumArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#efeae7',
  },
  albumPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTrack: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultArtist: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  resultDuration: {
    fontSize: 10,
    color: COLORS.muted,
    fontVariant: ['tabular-nums'],
  },

  selectedContainer: {
    backgroundColor: '#f2f7f2',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#d1e7d1',
    overflow: 'hidden',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  selectedTrack: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3a4a3c',
  },
  selectedArtist: {
    fontSize: 11,
    color: '#5a6b5c',
    marginTop: 1,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 11,
    color: COLORS.muted,
  },

  errorBox: {
    backgroundColor: '#fdf1f1',
    borderWidth: 1,
    borderColor: '#e8c5c5',
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#9E3D5A',
    textAlign: 'center',
  },

  noResultsBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
    padding: 16,
  },
  noResultsText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
