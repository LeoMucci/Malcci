// Carrossel de fotos estilo Instagram: paginação horizontal + indicadores (dots)
// + contador "n/total". Sem fotos, mostra um placeholder com o emoji da categoria.
// Suporta a renderização de vídeos usando expo-video de forma nativa e tag HTML5 na web.
// Utiliza expo-image para carregamento rápido e cache eficiente de imagens.

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS } from '@/constants/theme';

const PHOTO_HEIGHT = 380;

function isVideoUri(uri: string): boolean {
  const lowercase = uri.toLowerCase();
  return (
    lowercase.endsWith('.mp4') ||
    lowercase.endsWith('.mov') ||
    lowercase.endsWith('.m4v') ||
    lowercase.endsWith('.3gp') ||
    lowercase.includes('video') ||
    (uri.startsWith('blob:') && uri.includes('video'))
  );
}

const VideoItem = memo(({ uri, width }: { uri: string; width: number }) => {
  if (Platform.OS === 'web') {
    return (
      <video
        src={uri}
        style={{ width, height: PHOTO_HEIGHT, objectFit: 'cover' }}
        controls
        loop
        muted={false}
      />
    );
  }

  // Implementação nativa usando expo-video
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={[styles.video, { width }]}
      allowsPictureInPicture
    />
  );
});

interface PhotoCarouselProps {
  photos: string[];
  placeholderEmoji: string;
  placeholderTint: string;
}

function PhotoCarouselBase({ photos, placeholderEmoji, placeholderTint }: PhotoCarouselProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const lastWidth = useRef(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== lastWidth.current) {
      lastWidth.current = next;
      setWidth(next);
    }
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(prev => (prev === next ? prev : next));
  }, [width]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<string>) => {
    const isVideo = isVideoUri(item);
    if (isVideo) {
      return <VideoItem uri={item} width={width} />;
    }
    return <Image source={{ uri: item }} style={[styles.image, { width }]} contentFit="cover" transition={200} cachePolicy="disk" />;
  }, [width]);

  const keyExtractor = useCallback((item: string, i: number) => `${i}-${item}`, []);

  if (photos.length === 0) {
    return (
      <View style={[styles.placeholder, { backgroundColor: placeholderTint }]}>
        <Text style={styles.placeholderEmoji}>{placeholderEmoji}</Text>
      </View>
    );
  }

  if (photos.length === 1) {
    const isVideo = isVideoUri(photos[0]);
    return (
      <View style={styles.frame} onLayout={handleLayout}>
        {isVideo ? (
          <VideoItem uri={photos[0]} width={width} />
        ) : (
          <Image source={{ uri: photos[0] }} style={[styles.image, { width: width || undefined }]} contentFit="cover" transition={200} cachePolicy="disk" />
        )}
      </View>
    );
  }

  return (
    <View style={styles.frame} onLayout={handleLayout}>
      {width > 0 && (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}
      <View style={styles.counter}>
        <Text style={styles.counterText}>{index + 1}/{photos.length}</Text>
      </View>
      <View style={styles.dots}>
        {photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

export const PhotoCarousel = memo(PhotoCarouselBase);

const styles = StyleSheet.create({
  frame: { width: '100%', height: PHOTO_HEIGHT, backgroundColor: '#000', position: 'relative' },
  image: { height: PHOTO_HEIGHT },
  video: { height: PHOTO_HEIGHT },
  placeholder: { width: '100%', height: PHOTO_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 64, opacity: 0.45 },
  counter: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(20,10,15,0.55)', borderRadius: 12,
    paddingVertical: 3, paddingHorizontal: 9,
    zIndex: 10,
  },
  counterText: { color: '#fff', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dots: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
    zIndex: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 7, height: 7, borderRadius: 3.5 },
});
