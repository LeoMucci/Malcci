import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
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
}

export default function LocationSearch({ locationText, onSelect, onClear, placeholder }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSelected = !!locationText;

  const searchLocation = useCallback(async (text: string) => {
    if (text.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const encodedQuery = encodeURIComponent(text.trim());
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=6&addressdetails=1&accept-language=pt-BR`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CoupleApp/1.0',
        },
      });
      const data = await response.json();

      if (data && Array.isArray(data)) {
        setResults(data);
        setShowResults(true);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error('Location search error:', e);
      setResults([]);
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
      searchLocation(text);
    }, 500); // Nominatim asks for rate limiting
  };

  const handleSelect = (item: NominatimPlace) => {
    // Build a clean short name
    const addr = item.address;
    let shortName = '';

    if (addr) {
      const parts: string[] = [];
      if (addr.road) parts.push(addr.road);
      if (addr.suburb) parts.push(addr.suburb);
      const city = addr.city || addr.town || addr.village;
      if (city) parts.push(city);
      if (addr.state) parts.push(addr.state);
      
      shortName = parts.length > 0 ? parts.join(', ') : item.display_name.split(',').slice(0, 3).join(',');
    } else {
      shortName = item.display_name.split(',').slice(0, 3).join(',');
    }

    onSelect(
      shortName.trim(),
      parseFloat(item.lat),
      parseFloat(item.lon)
    );
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleClear = () => {
    onSelect('', null, null);
    setQuery('');
    setResults([]);
    setShowResults(false);
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
            />
            {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginLeft: 6 }} />}
          </View>

          {showResults && results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item) => (
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
            </View>
          )}

          {showResults && results.length === 0 && !loading && query.length >= 3 && (
            <View style={styles.noResultsBox}>
              <Text style={styles.noResultsText}>Nenhum local encontrado para "{query}"</Text>
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
