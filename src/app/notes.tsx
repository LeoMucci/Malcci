import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/theme';
import { NOTES as MOCK_NOTES } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import { getErrorMessage } from '@/lib/errors';
import { cleanText, isNonEmpty, LIMITS } from '@/lib/validation';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { ComposeNoteModal } from '@/features/notes/compose-note-modal';
import { NoteCard, type Note } from '@/features/notes/note-card';
import type { MessageRow } from '@/types/domain';

const LOVED_CACHE_KEY = '@loved_messages';

type BaseNote = Omit<Note, 'loved'>;
type NoteFilter = 'all' | 'imp';

function formatRelativeTime(dateStr: string): string {
  const dateObj = new Date(dateStr);
  const now = new Date();

  // Diferença em dias ignorando horas
  const dateStartOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = nowStartOfDay.getTime() - dateStartOfDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `${timeStr} hoje`;
  if (diffDays === 1) return `Ontem ${timeStr}`;
  return `${dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ${timeStr}`;
}

function mapMockNotes(): BaseNote[] {
  return MOCK_NOTES.map(n => ({
    id: n.id,
    who: n.who === 'a' ? 'a' : 'b',
    name: n.name,
    imp: n.imp,
    time: n.time,
    text: n.text,
  }));
}

function mapMessageRows(rows: MessageRow[]): BaseNote[] {
  return rows.map(m => ({
    id: m.id,
    who: m.author?.username === 'ela' ? 'a' : 'b',
    name: m.author?.display_name ?? 'Parceiro',
    imp: m.is_important,
    time: formatRelativeTime(m.created_at),
    text: m.content,
  }));
}

export default function NotesScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [baseNotes, setBaseNotes] = useState<BaseNote[]>([]);
  const [lovedIds, setLovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  // Cache local de recados curtidos (não-crítico: falha apenas deixa lista vazia)
  useEffect(() => {
    AsyncStorage.getItem(LOVED_CACHE_KEY)
      .then(value => {
        if (value) setLovedIds(JSON.parse(value) as string[]);
      })
      .catch(() => undefined);
  }, []);

  const loadNotes = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setBaseNotes(mapMockNotes());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          author:users(display_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBaseNotes(mapMessageRows((data ?? []) as MessageRow[]));
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar os recados.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useRealtimeRefresh(['messages'], loadNotes);

  // lovedIds só re-deriva a lista memoizada — não dispara novo fetch
  const notes = useMemo<Note[]>(
    () => baseNotes.map(n => ({ ...n, loved: lovedIds.includes(String(n.id)) })),
    [baseNotes, lovedIds],
  );

  const list = useMemo(
    () => (filter === 'imp' ? notes.filter(n => n.imp) : notes),
    [notes, filter],
  );

  const toggleLove = useCallback(async (id: string | number) => {
    const stringId = String(id);
    const updated = lovedIds.includes(stringId)
      ? lovedIds.filter(x => x !== stringId)
      : [...lovedIds, stringId];

    setLovedIds(updated);

    try {
      await AsyncStorage.setItem(LOVED_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível salvar a curtida no dispositivo.'), 'error');
    }
  }, [lovedIds, showToast]);

  const deleteNote = useCallback(async (id: string | number) => {
    const ok = await confirm({
      title: 'Apagar recado',
      message: 'Deseja apagar este recado?',
      confirmLabel: 'Apagar',
      destructive: true,
    });
    if (!ok) return;

    if (!isSupabaseConfigured) {
      setBaseNotes(prev => prev.filter(x => x.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      showToast('Recado apagado.', 'success');
      loadNotes();
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível apagar o recado.'), 'error');
    }
  }, [confirm, loadNotes, showToast]);

  const closeCompose = useCallback(() => {
    setIsAdding(false);
    setNewText('');
    setIsImportant(false);
  }, []);

  const handleAddNote = useCallback(async () => {
    if (!user) return;

    const content = cleanText(newText, LIMITS.message);
    if (!isNonEmpty(content)) {
      showToast('Escreva uma mensagem antes de enviar.', 'error');
      return;
    }

    if (!isSupabaseConfigured) {
      const localNote: BaseNote = {
        id: `n_${Date.now()}`,
        who: user.username === 'ela' ? 'a' : 'b',
        name: user.displayName,
        imp: isImportant,
        time: 'Agora mesmo',
        text: content,
      };
      setBaseNotes(prev => [localNote, ...prev]);
      closeCompose();
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({ author_id: user.id, content, is_important: isImportant });

      if (error) throw error;

      await sendNotification(
        user.id,
        'new_message',
        `${user.displayName} te deixou um recado! 💌`,
        isImportant ? `★ IMPORTANTE: "${content}"` : `"${content}"`,
      );

      closeCompose();
      showToast('Recado enviado! 💌', 'success');
      loadNotes();
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível enviar o recado.'), 'error');
    }
  }, [user, newText, isImportant, closeCompose, loadNotes, showToast]);

  const isNoteOwner = useCallback(
    (note: Note) =>
      (note.who === 'a' && user?.username === 'ela') || (note.who === 'b' && user?.username === 'eu'),
    [user],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recados</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Aviso de modo local quando o Supabase não está configurado */}
      {!isSupabaseConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipOn]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextOn]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'imp' && styles.filterChipOn]}
          onPress={() => setFilter('imp')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'imp' && styles.filterTextOn]}>Importantes</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading && notes.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando recados...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {list.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isOwner={isNoteOwner(note)}
              onToggleLove={toggleLove}
              onDelete={deleteNote}
            />
          ))}
          {list.length === 0 && <Text style={styles.empty}>Nenhum recado deixado ainda.</Text>}
        </ScrollView>
      )}

      {isAdding && (
        <ComposeNoteModal
          text={newText}
          important={isImportant}
          onChangeText={setNewText}
          onChangeImportant={setIsImportant}
          onCancel={closeCompose}
          onSubmit={handleAddNote}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },
  warningBanner: {
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(199, 154, 58, 0.2)',
  },
  warningText: {
    fontSize: 10.5,
    color: COLORS.gold,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipOn: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12, color: COLORS.muted },
  filterTextOn: { color: COLORS.headerAccent },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 30 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 13 },
});
