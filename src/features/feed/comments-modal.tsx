// Modal de detalhes da memória: lista de comentários + envio de novo comentário.

import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { isNonEmpty, LIMITS } from '@/lib/validation';
import type { MemoryView } from './types';

interface CommentsModalProps {
  /** Memória aberta, ou null quando o modal está fechado. */
  memory: MemoryView | null;
  onClose: () => void;
  onAddComment: (memory: MemoryView, text: string) => Promise<boolean>;
}

export function CommentsModal({ memory, onClose, onAddComment }: CommentsModalProps) {
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  if (!memory) return null;

  const handleSend = async () => {
    if (!isNonEmpty(commentText) || sending) return;
    setSending(true);
    try {
      const ok = await onAddComment(memory, commentText);
      if (ok) setCommentText('');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setCommentText('');
    onClose();
  };

  const canSend = isNonEmpty(commentText) && !sending;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={sharedStyles.modalOverlayCentered}>
        <View style={[sharedStyles.modalCardCentered, styles.card]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>{memory.title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 16, color: COLORS.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Comentários da Memória ({memory.comments.length})</Text>

          <ScrollView style={styles.commentsScroll} contentContainerStyle={styles.commentsContent} showsVerticalScrollIndicator={false}>
            {memory.comments.map((comment, index) => (
              <View key={index} style={styles.bubble}>
                <Text style={styles.author}>{comment.who}</Text>
                <Text style={styles.content}>{comment.text}</Text>
              </View>
            ))}
            {memory.comments.length === 0 && (
              <Text style={styles.emptyText}>Deixe o primeiro comentário sobre esse momento! 💕</Text>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escreva um comentário..."
              value={commentText}
              onChangeText={setCommentText}
              maxLength={LIMITS.comment}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              <Text style={styles.sendText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 380, height: 420, alignSelf: 'center', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingBottom: 10, marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, flex: 1 },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 10 },
  commentsScroll: { flex: 1, marginBottom: 12 },
  commentsContent: { gap: 10 },
  bubble: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10 },
  author: { fontSize: 11.5, fontWeight: '600', color: COLORS.accentDeep, marginBottom: 2 },
  content: { fontSize: 12.5, color: COLORS.text, lineHeight: 17 },
  emptyText: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 12.5, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.bg },
  sendBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { fontSize: 12.5, fontWeight: '600', color: '#ffffff' },
});
