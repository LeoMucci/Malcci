import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Switch, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADIUS } from '@/constants/theme';
import { NOTES as INIT_NOTES } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

interface Note {
  id: string | number;
  who: 'a' | 'b';
  name: string;
  imp: boolean;
  time: string;
  text: string;
  loved: boolean;
}

function formatRelativeTime(dateStr: string) {
  const dateObj = new Date(dateStr);
  const now = new Date();
  
  // Calculate difference in days ignoring hours
  const dateStartOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = nowStartOfDay.getTime() - dateStartOfDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0) {
    return `${timeStr} hoje`;
  } else if (diffDays === 1) {
    return `Ontem ${timeStr}`;
  } else {
    return `${dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ${timeStr}`;
  }
}

export default function NotesScreen() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [lovedIds, setLovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'imp'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check Supabase configurations
  useEffect(() => {
    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
    setIsConfigured(!!(isUrlConfigured && isKeyConfigured));
  }, []);

  // Load loved notes local cache
  useEffect(() => {
    async function loadLovedCache() {
      try {
        const val = await AsyncStorage.getItem('@loved_messages');
        if (val) {
          setLovedIds(JSON.parse(val));
        }
      } catch (e) {
        console.error('Failed to load loved messages cache', e);
      }
    }
    loadLovedCache();
  }, []);

  // Fetch messages from Supabase
  const loadNotes = async () => {
    setLoading(true);

    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');

    if (!isUrlConfigured || !isKeyConfigured) {
      // Local fallback
      const mappedMocks: Note[] = INIT_NOTES.map(n => ({
        ...n,
        loved: lovedIds.includes(String(n.id)),
      }));
      setNotes(mappedMocks);
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

      if (data) {
        const mapped: Note[] = data.map(m => ({
          id: m.id,
          who: m.author?.username === 'ela' ? 'a' : 'b',
          name: m.author?.display_name || 'Parceiro',
          imp: m.is_important,
          time: formatRelativeTime(m.created_at),
          text: m.content,
          loved: lovedIds.includes(String(m.id)),
        }));
        setNotes(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      // Fallback
      setNotes(INIT_NOTES as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [user, lovedIds]);

  const toggleLove = async (id: string | number) => {
    const stringId = String(id);
    const updated = lovedIds.includes(stringId)
      ? lovedIds.filter(x => x !== stringId)
      : [...lovedIds, stringId];
    
    setLovedIds(updated);
    setNotes(prev => prev.map(x => x.id === id ? { ...x, loved: !x.loved } : x));
    
    try {
      await AsyncStorage.setItem('@loved_messages', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save loved status', e);
    }
  };
  
  const deleteNote = async (id: string | number) => {
    if (!isConfigured) {
      setNotes(n => n.filter(x => x.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNotes();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const handleAddNote = async () => {
    if (!newText.trim() || !user) return;

    if (!isConfigured) {
      const newNote: Note = {
        id: `n_${Date.now()}`,
        who: user.username === 'ela' ? 'a' : 'b',
        name: user.displayName,
        imp: isImportant,
        time: 'Agora mesmo',
        text: newText,
        loved: false,
      };
      setNotes([newNote, ...notes]);
      setNewText('');
      setIsImportant(false);
      setIsAdding(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          author_id: user.id,
          content: newText,
          is_important: isImportant,
        });

      if (error) throw error;
      
      await sendNotification(
        user.id,
        'new_message',
        `${user.displayName} te deixou um recado! 💌`,
        isImportant ? `★ IMPORTANTE: "${newText}"` : `"${newText}"`
      );

      setNewText('');
      setIsImportant(false);
      setIsAdding(false);
      loadNotes();
    } catch (e) {
      console.error('Failed to create message:', e);
    }
  };

  const list = filter === 'imp' ? notes.filter(n => n.imp) : notes;

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

      {/* Warning local mode banner if not configured */}
      {!isConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      {/* Filter Chips */}
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

      {/* Scrollable list */}
      {loading && notes.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando recados...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {list.map(n => {
            const isOwner = (n.who === 'a' && user?.username === 'ela') || (n.who === 'b' && user?.username === 'eu');
            return (
              <View key={n.id} style={styles.card}>
                <View style={styles.noteTop}>
                  <View style={[styles.noteAv, n.who === 'a' ? styles.avA : styles.avB]}>
                    <Text style={styles.avText}>{n.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.noteWho}>{n.name}</Text>
                  {n.imp && <Text style={styles.noteImp}>★</Text>}
                  <Text style={styles.noteTime}>{n.time}</Text>
                </View>
                <Text style={styles.noteText}>{n.text}</Text>
                <View style={styles.noteFoot}>
                  <TouchableOpacity
                    style={[styles.noteHeart, n.loved && styles.noteHeartOn]}
                    onPress={() => toggleLove(n.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, color: n.loved ? COLORS.accent : COLORS.muted }}>
                      {n.loved ? '♥' : '♡'}
                    </Text>
                    <Text style={{ fontSize: 12, color: n.loved ? COLORS.accent : COLORS.muted }}>
                      {n.loved ? 'amei' : 'curtir'}
                    </Text>
                  </TouchableOpacity>

                  {/* Only author can delete (per spec) */}
                  {isOwner && (
                    <TouchableOpacity style={styles.noteDel} onPress={() => deleteNote(n.id)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 15, color: '#c9b0b8' }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {list.length === 0 && <Text style={styles.empty}>Nenhum recado deixado ainda.</Text>}
        </ScrollView>
      )}

      {/* Write New Note Modal Overlay */}
      {isAdding && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Deixar um Recado</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Escreva sua mensagem com carinho..."
              placeholderTextColor="#a69098"
              multiline
              numberOfLines={4}
              value={newText}
              onChangeText={setNewText}
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Marcar como Importante</Text>
                <Text style={styles.switchSub}>Aparece destacado com uma estrela</Text>
              </View>
              <Switch
                value={isImportant}
                onValueChange={setIsImportant}
                trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
                thumbColor={isImportant ? COLORS.accent : '#f4f3f4'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => {
                  setIsAdding(false);
                  setNewText('');
                  setIsImportant(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn, !newText.trim() && styles.saveBtnDisabled]} 
                onPress={handleAddNote}
                disabled={!newText.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 13 },
  noteTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  noteAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avA: { backgroundColor: '#e6b3c5' },
  avB: { backgroundColor: '#b3c7dd' },
  avText: { fontSize: 11, fontWeight: '600' },
  noteWho: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  noteImp: { color: COLORS.gold, fontSize: 14 },
  noteTime: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },
  noteText: { fontSize: 13.5, color: COLORS.text, lineHeight: 20 },
  noteFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  noteHeart: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noteHeartOn: {},
  noteDel: { marginLeft: 'auto', padding: 3 },

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
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 13 },

  /* Modal Styles */
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 10, 15, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontStyle: 'italic',
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: COLORS.bg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  switchLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.text,
  },
  switchSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.muted,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
  },
  saveBtnDisabled: {
    backgroundColor: COLORS.accentSoft,
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#ffffff',
  },
});
