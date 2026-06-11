// Mapa interativo na web: Leaflet dentro de um <iframe> (isola CSS/JS do app).

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { buildMapHtml, type MapPoint } from './leaflet-html';

interface InteractiveMapProps {
  points: MapPoint[];
}

export function InteractiveMap({ points }: InteractiveMapProps) {
  const html = useMemo(() => buildMapHtml(points), [points]);

  return (
    <View style={styles.container}>
      <iframe
        title="Mapa das nossas memórias"
        srcDoc={html}
        style={{ border: 'none', width: '100%', height: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
