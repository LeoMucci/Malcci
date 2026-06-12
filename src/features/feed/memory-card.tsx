// Card de memória no estilo Instagram / Scrapbook temático: cabeçalho (avatar + autor + local),
// carrossel de fotos (ocultado se não houver mídias), ações (curtir/comentar/favoritar),
// curtidas, legenda estilizada conforme o tema da categoria (Filme, Restaurante, Passeio, Especial/Encontro),
// faixa de reações e player da trilha sonora.
// Utiliza expo-image para carregamento ultrarrápido e cache eficiente dos avatares de perfil.

import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, MTYPE, REACTION_SET } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { PhotoCarousel } from './photo-carousel';
import { useAudioPreview } from './use-audio-preview';
import type { MemoryId, MemoryView } from './types';

const PRIMARY_EMOJI = '❤️';
const SECONDARY_EMOJIS = REACTION_SET.filter(e => e !== PRIMARY_EMOJI).slice(0, 4);

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  movie: '🎬',
  place: '📍',
  special: '💖',
  shopping: '🛍️',
  date: '🌹',
  passeio: '🗺️',
  travel: '✈️',
};

function categoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] ?? '✨';
}

/** Cor do avatar conforme o autor (Luysa rosa, Leonardo azul). */
function avatarColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('luysa') || n.includes('ela')) return '#e6b3c5';
  if (n.includes('leo')) return '#b3c7dd';
  return COLORS.accentSoft;
}

interface MemoryCardProps {
  memory: MemoryView;
  isCreator: boolean;
  onOpenComments: (memoryId: MemoryId) => void;
  onToggleFavorite: (memoryId: MemoryId, currentFav: boolean) => void;
  onReact: (memoryId: MemoryId, emoji: string) => void;
  onEdit: (memory: MemoryView) => void;
  onDelete: (memoryId: MemoryId) => void;
}

function MemoryCardBase({ memory: m, isCreator, onOpenComments, onToggleFavorite, onReact, onEdit, onDelete }: MemoryCardProps) {
  const t = MTYPE[m.cat] || MTYPE.other;
  const { playingId, loadingId, toggle } = useAudioPreview();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const idStr = String(m.id);
  const isPlaying = playingId === idStr;
  const isLoadingAudio = loadingId === idStr;

  const heart = m.reactions.find(r => r.emoji === PRIMARY_EMOJI);
  const totalLikes = m.reactions.reduce((sum, r) => sum + r.count, 0);

  const openMenu = useCallback(() => {
    setConfirmingDelete(false);
    setMenuOpen(true);
  }, []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmingDelete(false);
  }, []);
  const handleEdit = useCallback(() => {
    closeMenu();
    onEdit(m);
  }, [closeMenu, onEdit, m]);
  const handleConfirmDelete = useCallback(() => {
    closeMenu();
    onDelete(m.id);
  }, [closeMenu, onDelete, m.id]);

  const handlePlay = useCallback(() => {
    if (!m.spotify) return;
    toggle({ id: idStr, track: m.spotify.track, artist: m.spotify.artist, previewUrl: m.spotify.previewUrl });
  }, [m.spotify, idStr, toggle]);

  const hasPhotos = m.photos && m.photos.length > 0;
  const isMovie = m.cat === 'movie';
  const isRestaurant = m.cat === 'restaurant';
  const isSpecialOrDate = m.cat === 'special' || m.cat === 'date';
  const isPasseioOrPlace = m.cat === 'passeio' || m.cat === 'place' || m.cat === 'travel';

  const cardStyles = [
    styles.card,
    isMovie && styles.cardMovie,
    isRestaurant && styles.cardRestaurant,
    isSpecialOrDate && styles.cardSpecial,
    isPasseioOrPlace && styles.cardPasseio,
    !hasPhotos && styles.cardTextOnly,
  ];

  return (
    <View style={cardStyles}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {m.byAvatarUrl ? (
            <Image source={{ uri: m.byAvatarUrl }} style={styles.avatarImage} cachePolicy="disk" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: avatarColor(m.by) }]}>
              <Text style={styles.avatarText}>{m.by.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.author, isMovie && { color: '#ECE9F2' }]} numberOfLines={1}>{m.by}</Text>
          {m.loc ? (
            <Text style={[styles.headerLoc, isMovie && { color: '#A59EB1' }]} numberOfLines={1}>📍 {m.loc}</Text>
          ) : (
            <Text style={[styles.headerLoc, isMovie && { color: '#A59EB1' }]}>{t.label}</Text>
          )}
        </View>
        <View style={[styles.typeChip, { backgroundColor: t.tint }]}>
          <Text style={[styles.typeChipText, { color: t.color }]}>{m.tag}</Text>
        </View>
        {isCreator && (
          <TouchableOpacity onPress={openMenu} style={styles.menuBtn} hitSlop={8} activeOpacity={0.6}>
            <Text style={[styles.menuText, isMovie && { color: '#ECE9F2' }]}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fotos / Vídeos (oculta totalmente se não houver mídias) */}
      {hasPhotos && (
        <PhotoCarousel photos={m.photos} placeholderEmoji={categoryEmoji(m.cat)} placeholderTint={t.tint} />
      )}

      {/* Ações */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onReact(m.id, PRIMARY_EMOJI)} hitSlop={6} activeOpacity={0.6}>
          <Text style={[styles.actionIcon, heart?.mine && styles.actionIconActive, isMovie && !heart?.mine && { color: '#ECE9F2' }]}>
            {heart?.mine ? '❤️' : (isMovie ? '🖤' : '🤍')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenComments(m.id)} hitSlop={6} activeOpacity={0.6}>
          <Text style={[styles.actionIcon, isMovie && { color: '#ECE9F2' }]}>💬</Text>
        </TouchableOpacity>
        {m.spotify && (
          <TouchableOpacity onPress={handlePlay} hitSlop={6} activeOpacity={0.6} style={styles.audioAction}>
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color={isMovie ? '#ECE9F2' : COLORS.text} />
            ) : (
              <Text style={[styles.actionIcon, isMovie && { color: '#ECE9F2' }]}>{isPlaying ? '⏸️' : '🎵'}</Text>
            )}
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => onToggleFavorite(m.id, m.fav)} hitSlop={6} activeOpacity={0.6}>
          <Text style={[styles.actionIcon, m.fav && styles.bookmarkActive, isMovie && !m.fav && { color: '#ECE9F2' }]}>{m.fav ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Curtidas */}
      {totalLikes > 0 && (
        <Text style={[styles.likes, isMovie && { color: '#ECE9F2' }]}>{totalLikes} {totalLikes === 1 ? 'curtida' : 'curtidas'}</Text>
      )}

      {/* Legenda / Conteúdo */}
      <View style={[styles.caption, !hasPhotos && styles.captionTextOnly, !hasPhotos && isSpecialOrDate && styles.captionRomanticTextOnly]}>
        <Text style={[styles.captionText, isMovie && { color: '#ECE9F2' }]}>
          <Text style={[styles.captionAuthor, isMovie && { color: '#ECE9F2' }]}>{m.by} </Text>
          <Text style={[styles.captionTitle, !hasPhotos && styles.captionTitleTextOnly, isMovie && { color: '#e0a0b6', fontStyle: 'italic' }]}>{m.title}</Text>
        </Text>
        {!!m.desc && (
          <Text style={[
            styles.desc,
            !hasPhotos && styles.descTextOnly,
            isMovie && { color: '#C2BCCB' },
            isRestaurant && { color: '#5A4A42' },
          ]}>
            {m.desc}
          </Text>
        )}
        {m.stars > 0 && (
          <Text style={styles.stars}>{'★'.repeat(m.stars)}{'☆'.repeat(Math.max(0, 5 - m.stars))}</Text>
        )}
      </View>

      {/* Player da trilha sonora */}
      {m.spotify && (
        <TouchableOpacity style={[styles.musicPill, isMovie && styles.musicPillMovie]} onPress={handlePlay} activeOpacity={0.8}>
          <View style={[styles.musicPlay, isMovie && styles.musicPlayMovie]}>
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#1DB954" />
            ) : (
              <Text style={styles.musicPlayIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.musicTrack, isMovie && { color: '#ECE9F2' }]} numberOfLines={1}>{m.spotify.track}</Text>
            <Text style={[styles.musicArtist, isMovie && { color: '#A59EB1' }]} numberOfLines={1}>{m.spotify.artist}</Text>
          </View>
          <Text style={styles.musicNote}>♫</Text>
        </TouchableOpacity>
      )}

      {/* Faixa de reações */}
      <View style={styles.reactionStrip}>
        {SECONDARY_EMOJIS.map(emoji => {
          const react = m.reactions.find(r => r.emoji === emoji);
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionPill, react?.mine && styles.reactionPillMine, isMovie && styles.reactionPillMovie, isMovie && react?.mine && styles.reactionPillMovieMine]}
              onPress={() => onReact(m.id, emoji)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13 }}>{emoji}</Text>
              {!!react && <Text style={[styles.reactionCount, react.mine && { color: COLORS.accentDeep }, isMovie && { color: '#A59EB1' }, isMovie && react.mine && { color: '#e0a0b6' }]}>{react.count}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rodapé: comentários + data */}
      <TouchableOpacity onPress={() => onOpenComments(m.id)} activeOpacity={0.6} style={styles.footer}>
        <Text style={[styles.footerComments, isMovie && { color: '#A59EB1' }]}>
          {m.comments.length > 0 ? `Ver todos os ${m.comments.length} comentários` : 'Comentar...'}
        </Text>
        <Text style={[styles.footerDate, isMovie && { color: '#887E98' }]}>{m.date}</Text>
      </TouchableOpacity>

      {/* Menu de ações (••• ) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={styles.sheet}>
            <View style={sharedStyles.modalHandle} />
            <Text style={styles.sheetTitle} numberOfLines={1}>{m.title}</Text>

            {confirmingDelete ? (
              <>
                <Text style={styles.sheetConfirm}>Apagar esta memória? Não dá pra desfazer.</Text>
                <TouchableOpacity style={[styles.sheetItem, styles.sheetDanger]} onPress={handleConfirmDelete} activeOpacity={0.7}>
                  <Text style={styles.sheetDangerText}>Sim, apagar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={() => setConfirmingDelete(false)} activeOpacity={0.7}>
                  <Text style={styles.sheetItemText}>Voltar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.sheetItem} onPress={handleEdit} activeOpacity={0.7}>
                  <Text style={styles.sheetItemText}>✏️  Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={() => setConfirmingDelete(true)} activeOpacity={0.7}>
                  <Text style={[styles.sheetItemText, { color: COLORS.accentDeep }]}>🗑️  Apagar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sheetItem, styles.sheetCancel]} onPress={closeMenu} activeOpacity={0.7}>
                  <Text style={styles.sheetCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export const MemoryCard = memo(MemoryCardBase);

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 0 },
  
  // Estilos temáticos de Cards
  cardMovie: {
    backgroundColor: '#1E1B24',
    borderColor: '#362E40',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cardRestaurant: {
    backgroundColor: '#FCFAF7',
    borderColor: '#ECE2DD',
    borderWidth: 1.5,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cardSpecial: {
    backgroundColor: '#FFF8FA',
    borderColor: '#FAE7EF',
    borderWidth: 1.5,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cardPasseio: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEE',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: '#1A3344',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cardTextOnly: {
    paddingVertical: 4,
  },

  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  headerInfo: { flex: 1 },
  author: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  headerLoc: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  typeChip: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 11 },
  typeChipText: { fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
  menuBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  menuText: { fontSize: 16, color: COLORS.text, fontWeight: '700', letterSpacing: 1 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 4 },
  actionIcon: { fontSize: 23 },
  actionIconActive: { transform: [{ scale: 1.05 }] },
  audioAction: { minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  bookmarkActive: {},

  likes: { fontSize: 13, fontWeight: '700', color: COLORS.text, paddingHorizontal: 13, paddingTop: 4 },

  caption: { paddingHorizontal: 13, paddingTop: 5 },
  captionText: { fontSize: 13.5, color: COLORS.text, lineHeight: 19 },
  captionAuthor: { fontWeight: '700' },
  captionTitle: { fontWeight: '500' },
  desc: { fontSize: 13, color: '#7d6770', lineHeight: 19, marginTop: 3 },
  stars: { fontSize: 13, color: '#e0a83a', marginTop: 4, letterSpacing: 1 },

  // Estilos de Twitter/X para cards sem fotos
  captionTextOnly: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.accent,
    backgroundColor: '#FAF5F7',
    borderRadius: 8,
    marginHorizontal: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  captionRomanticTextOnly: {
    borderLeftColor: '#b03b57',
    backgroundColor: '#FFF1F5',
  },
  captionTitleTextOnly: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  descTextOnly: {
    fontSize: 14.5,
    color: '#3c3537',
    lineHeight: 22,
    marginTop: 6,
  },

  musicPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f2f7f2', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11, marginHorizontal: 13, marginTop: 10 },
  musicPillMovie: { backgroundColor: '#182C1D' },
  musicPlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1e7d1' },
  musicPlayMovie: { backgroundColor: '#1E1B24', borderColor: '#23442A' },
  musicPlayIcon: { fontSize: 12, color: '#1DB954', marginLeft: 1 },
  musicTrack: { fontSize: 12.5, fontWeight: '600', color: '#3a4a3c' },
  musicArtist: { fontSize: 11, color: '#5a6b5c', marginTop: 1 },
  musicNote: { fontSize: 16, color: '#1DB954' },

  reactionStrip: { flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingTop: 10, flexWrap: 'wrap' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9 },
  reactionPillMine: { backgroundColor: COLORS.accentSoft, borderColor: 'rgba(200,90,124,0.4)' },
  reactionPillMovie: { backgroundColor: '#16131B', borderColor: '#362E40' },
  reactionPillMovieMine: { backgroundColor: '#361D2E', borderColor: '#C85A7C' },
  reactionCount: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  footer: { paddingHorizontal: 13, paddingTop: 9, paddingBottom: 14 },
  footerComments: { fontSize: 12.5, color: COLORS.muted },
  footerDate: { fontSize: 10.5, color: '#c3aab2', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(20,10,14,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 30, gap: 8 },
  sheetTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  sheetConfirm: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 8, lineHeight: 18 },
  sheetItem: { paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center' },
  sheetItemText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  sheetDanger: { backgroundColor: COLORS.accentDeep },
  sheetDangerText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  sheetCancel: { backgroundColor: 'transparent', marginTop: 2 },
  sheetCancelText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
});
