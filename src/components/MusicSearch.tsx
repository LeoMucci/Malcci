import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, FlatList } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string; cover_small: string; cover_medium: string };
  preview: string;
  duration: number;
}

interface MusicSearchProps {
  trackName: string;
  artistName: string;
  onSelect: (track: string, artist: string) => void;
  onClear?: () => void;
}

export default function MusicSearch({ trackName, artistName, onSelect, onClear }: MusicSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSelected = !!(trackName && artistName);

  const searchMusic = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Using a CORS proxy for web + direct for native
      const encodedQuery = encodeURIComponent(text.trim());
      const url = `https://api.deezer.com/search?q=${encodedQuery}&limit=8&output=jsonp&callback=`;
      
      // For web, we need to use JSONP or a proxy — let's use corsproxy.io
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=${encodedQuery}&limit=8`)}`;

      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data && data.data) {
        setResults(data.data);
        setShowResults(true);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error('Music search error:', e);
      // Fallback: try iTunes API which has CORS support
      try {
        const encodedQuery = encodeURIComponent(text.trim());
        const itunesUrl = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&limit=8`;
        const response = await fetch(itunesUrl);
        const data = await response.json();
        
        if (data && data.results) {
          const mapped: DeezerTrack[] = data.results.map((item: any) => ({
            id: item.trackId,
            title: item.trackName,
            artist: { name: item.artistName },
            album: { 
              title: item.collectionName, 
              cover_small: item.artworkUrl60,
              cover_medium: item.artworkUrl100 
            },
            preview: item.previewUrl,
            duration: Math.floor(item.trackTimeMillis / 1000),
          }));
          setResults(mapped);
          setShowResults(true);
        }
      } catch (e2) {
        console.error('iTunes fallback error:', e2);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      searchMusic(text);
    }, 400);
  };

  const handleSelect = (item: DeezerTrack) => {
    onSelect(item.title, item.artist.name);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleClear = () => {
    onSelect('', '');
    setQuery('');
    setResults([]);
    setShowResults(false);
    onClear?.();
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

          {showResults && results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.album.cover_small ? (
                    <Image source={{ uri: item.album.cover_small }} style={styles.albumArt} />
                  ) : (
                    <View style={[styles.albumArt, styles.albumPlaceholder]}>
                      <Text style={{ fontSize: 14 }}>🎵</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTrack} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resultArtist} numberOfLines={1}>{item.artist.name}</Text>
                  </View>
                  {item.duration > 0 && (
                    <Text style={styles.resultDuration}>{formatDuration(item.duration)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showResults && results.length === 0 && !loading && query.length >= 2 && (
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
