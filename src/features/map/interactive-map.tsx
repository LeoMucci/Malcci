// Mapa interativo no nativo (iOS/Android): Leaflet dentro de um WebView.

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml, type MapPoint } from './leaflet-html';

interface InteractiveMapProps {
  points: MapPoint[];
}

export function InteractiveMap({ points }: InteractiveMapProps) {
  const html = useMemo(() => buildMapHtml(points), [points]);

  return (
    <WebView
      style={styles.webview}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      setBuiltInZoomControls={false}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#faf7f5' },
});
