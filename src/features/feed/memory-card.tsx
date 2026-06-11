// Card de memória no estilo Instagram: cabeçalho (avatar + autor + local),
// carrossel de fotos, ações (curtir/comentar/favoritar), curtidas, legenda,
// faixa de reações e player da trilha sonora.

import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  place: '🏖️',
  special: '💖',
  shopping: '🛍️',
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

  return (
    <View style={styles.card}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(m.by) }]}>
          <Text style={styles.avatarText}>{m.by.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.author} numberOfLines={1}>{m.by}</Text>
          {m.loc ? (
            <Text style={styles.headerLoc} numberOfLines={1}>📍 {m.loc}</Text>
          ) : (
            <Text style={styles.headerLoc}>{t.label}</Text>
          )}
        </View>
        <View style={[styles.typeChip, { backgroundColor: t.tint }]}>
          <Text style={[styles.typeChipText, { color: t.color }]}>{m.tag}</Text>
        </View>
        {isCreator && (
          <TouchableOpacity onPress={openMenu} style={styles.menuBtn} hitSlop={8} activeOpacity={0.6}>
            <Text style={styles.menuText}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fotos */}
      <PhotoCarousel photos={m.photos} placeholderEmoji={categoryEmoji(m.cat)} placeholderTint={t.tint} />

      {/* Ações */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onReact(m.id, PRIMARY_EMOJI)} hitSlop={6} activeOpacity={0.6}>
          <Text style={[styles.actionIcon, heart?.mine && styles.actionIconActive]}>
            {heart?.mine ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenComments(m.id)} hitSlop={6} activeOpacity={0.6}>
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
        {m.spotify && (
          <TouchableOpacity onPress={handlePlay} hitSlop={6} activeOpacity={0.6} style={styles.audioAction}>
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={styles.actionIcon}>{isPlaying ? '⏸️' : '🎵'}</Text>
            )}
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => onToggleFavorite(m.id, m.fav)} hitSlop={6} activeOpacity={0.6}>
          <Text style={[styles.actionIcon, m.fav && styles.bookmarkActive]}>{m.fav ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Curtidas */}
      {totalLikes > 0 && (
        <Text style={styles.likes}>{totalLikes} {totalLikes === 1 ? 'curtida' : 'curtidas'}</Text>
      )}

      {/* Legenda */}
      <View style={styles.caption}>
        <Text style={styles.captionText}>
          <Text style={styles.captionAuthor}>{m.by} </Text>
          <Text style={styles.captionTitle}>{m.title}</Text>
        </Text>
        {!!m.desc && <Text style={styles.desc}>{m.desc}</Text>}
        {m.stars > 0 && (
          <Text style={styles.stars}>{'★'.repeat(m.stars)}{'☆'.repeat(Math.max(0, 5 - m.stars))}</Text>
        )}
      </View>

      {/* Player da trilha sonora */}
      {m.spotify && (
        <TouchableOpacity style={styles.musicPill} onPress={handlePlay} activeOpacity={0.8}>
          <View style={styles.musicPlay}>
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#1DB954" />
            ) : (
              <Text style={styles.musicPlayIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.musicTrack} numberOfLines={1}>{m.spotify.track}</Text>
            <Text style={styles.musicArtist} numberOfLines={1}>{m.spotify.artist}</Text>
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
              style={[styles.reactionPill, react?.mine && styles.reactionPillMine]}
              onPress={() => onReact(m.id, emoji)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13 }}>{emoji}</Text>
              {!!react && <Text style={[styles.reactionCount, react.mine && { color: COLORS.accentDeep }]}>{react.count}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rodapé: comentários + data */}
      <TouchableOpacity onPress={() => onOpenComments(m.id)} activeOpacity={0.6} style={styles.footer}>
        <Text style={styles.footerComments}>
          {m.comments.length > 0 ? `Ver todos os ${m.comments.length} comentários` : 'Comentar...'}
        </Text>
        <Text style={styles.footerDate}>{m.date}</Text>
      </TouchableOpacity>

      {/* Menu de ações (••• ) — bottom sheet próprio (Alert não funciona na web) */}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
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

  musicPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f2f7f2', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11, marginHorizontal: 13, marginTop: 10 },
  musicPlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1e7d1' },
  musicPlayIcon: { fontSize: 12, color: '#1DB954', marginLeft: 1 },
  musicTrack: { fontSize: 12.5, fontWeight: '600', color: '#3a4a3c' },
  musicArtist: { fontSize: 11, color: '#5a6b5c', marginTop: 1 },
  musicNote: { fontSize: 16, color: '#1DB954' },

  reactionStrip: { flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingTop: 10, flexWrap: 'wrap' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9 },
  reactionPillMine: { backgroundColor: COLORS.accentSoft, borderColor: 'rgba(200,90,124,0.4)' },
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
