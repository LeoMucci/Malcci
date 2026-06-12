import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface LocationSearchProps {
  locationText: string;
  onSelect: (location: string, lat: number | null, lng: number | null) => void;
  onClear?: () => void;
  placeholder?: string;
  countrycodes?: string;
}

const SEARCH_DEBOUNCE_MS = 500; // Nominatim pede rate limiting
const REQUEST_TIMEOUT_MS = 8000;
const MIN_QUERY_LENGTH = 3;
const RESULT_LIMIT = 6;

/** Busca JSON com timeout próprio, encadeado a um sinal externo de cancelamento. */
async function fetchJsonWithTimeout<T>(
  url: string,
  externalSignal: AbortSignal,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort();

  if (externalSignal.aborted) controller.abort();
  externalSignal.addEventListener('abort', abortFromExternal);

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    externalSignal.removeEventListener('abort', abortFromExternal);
  }
}

export default function LocationSearch({ locationText, onSelect, onClear, placeholder, countrycodes }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const isSelected = !!locationText;

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

  const searchLocation = useCallback(
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
        const encodedQuery = encodeURIComponent(trimmed);
        const countryParam = countrycodes ? `&countrycodes=${countrycodes}` : '';
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${RESULT_LIMIT}&addressdetails=1&accept-language=pt-BR${countryParam}`;

        const data = await fetchJsonWithTimeout<NominatimPlace[]>(url, controller.signal, {
          headers: {
            'User-Agent': 'CoupleApp/1.0',
          },
        });

        if (requestId !== requestIdRef.current) return; // resposta obsoleta — ignora
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch (error) {
        if (requestId !== requestIdRef.current) return; // busca cancelada/substituída
        console.warn('Location search error:', getErrorMessage(error, 'falha de rede'));
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

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      searchLocation(text);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = (item: NominatimPlace) => {
    // Build a clean short name
    const addr = item.address;
    let shortName = '';

    if (addr) {
      const parts: string[] = [];

      // Extract primary name of the place / POI if present
      const firstName = item.display_name.split(',')[0].trim();
      const isRoad = addr.road && firstName.toLowerCase() === addr.road.toLowerCase();
      const isHouseNumber = addr.house_number && firstName === addr.house_number;

      if (firstName && !isRoad && !isHouseNumber) {
        parts.push(firstName);
      }

      // Append road with house number if available
      if (addr.road) {
        const roadPart = addr.house_number ? `${addr.road}, ${addr.house_number}` : addr.road;
        parts.push(roadPart);
      }

      if (addr.suburb) parts.push(addr.suburb);
      const city = addr.city || addr.town || addr.village;
      if (city) parts.push(city);
      if (addr.state) parts.push(addr.state);

      shortName = parts.length > 0 ? parts.join(', ') : item.display_name.split(',').slice(0, 3).join(',');
    } else {
      shortName = item.display_name.split(',').slice(0, 3).join(',');
    }

    cancelPendingSearch();
    onSelect(
      shortName.trim(),
      parseFloat(item.lat),
      parseFloat(item.lon)
    );
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError(false);
    setLoading(false);
  };

  const handleClear = () => {
    cancelPendingSearch();
    onSelect('', null, null);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError(false);
    setLoading(false);
    onClear?.();
  };

  const formatDisplayName = (item: NominatimPlace) => {
    // Shorten the display name for the dropdown
    const parts = item.display_name.split(',').map(s => s.trim());
    if (parts.length > 4) {
      return parts.slice(0, 4).join(', ');
    }
    return item.display_name;
  };

  const getTypeIcon = (type: string) => {
    if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(type)) return '🍽️';
    if (['hotel', 'hostel', 'guest_house'].includes(type)) return '🏨';
    if (['park', 'garden', 'nature_reserve'].includes(type)) return '🌿';
    if (['museum', 'theatre', 'cinema', 'arts_centre'].includes(type)) return '🎨';
    if (['beach', 'water', 'bay'].includes(type)) return '🏖️';
    if (['city', 'town', 'village'].includes(type)) return '🏙️';
    if (['suburb', 'neighbourhood', 'residential'].includes(type)) return '🏘️';
    return '📍';
  };

  return (
    <View style={styles.container}>
      {isSelected ? (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedInfo}>
            <Text style={{ fontSize: 14 }}>📍</Text>
            <Text style={styles.selectedText} numberOfLines={2}>{locationText}</Text>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.inputRow}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>📍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder || "Buscar endereço, cidade, local..."}
              placeholderTextColor="#a69098"
              value={query}
              onChangeText={handleChangeText}
              autoCorrect={false}
              onSubmitEditing={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                searchLocation(query);
              }}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginLeft: 6 }} />}
          </View>

          {showResults && (
            <ScrollView 
              style={styles.resultsList} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Option to use custom typed text */}
              {query.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.resultItem, styles.customResultItem]}
                  onPress={() => {
                    cancelPendingSearch();
                    onSelect(query.trim(), null, null);
                    setQuery('');
                    setResults([]);
                    setShowResults(false);
                    setSearchError(false);
                    setLoading(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultIcon}>✍️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customResultText} numberOfLines={1}>
                      Usar texto digitado: "{query.trim()}"
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* API results */}
              {!searchError && results.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.resultItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultIcon}>{getTypeIcon(item.type)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={2}>
                      {formatDisplayName(item)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* API search error message */}
              {searchError && !loading && (
                <View style={styles.errorInnerBox}>
                  <Text style={styles.errorText}>Falha ao buscar locais online — selecione o texto digitado acima se desejar.</Text>
                </View>
              )}

              {/* API no results message */}
              {!searchError && results.length === 0 && !loading && query.trim().length >= MIN_QUERY_LENGTH && (
                <View style={styles.noResultsInnerBox}>
                  <Text style={styles.noResultsText}>Nenhum local encontrado no mapa.</Text>
                </View>
              )}
            </ScrollView>
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
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  resultIcon: {
    fontSize: 16,
  },
  resultName: {
    fontSize: 12.5,
    color: COLORS.text,
    lineHeight: 17,
  },

  selectedContainer: {
    backgroundColor: '#eef4ff',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#c7daf5',
    overflow: 'hidden',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  selectedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2c4a6e',
    flex: 1,
    lineHeight: 18,
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

  errorInnerBox: {
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: '#fdf1f1',
  },
  errorText: {
    fontSize: 12,
    color: '#9E3D5A',
    textAlign: 'center',
  },

  noResultsInnerBox: {
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  noResultsText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  customResultItem: {
    backgroundColor: COLORS.accentSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customResultText: {
    fontSize: 13,
    color: COLORS.accentDeep,
    fontWeight: '600',
  },
});
