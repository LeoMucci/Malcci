// Tela do feed de memórias: casca fina sobre a feature em src/features/feed.

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type ListRenderItemInfo } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useAuth } from '@/hooks/use-auth';
import { CommentsModal } from '@/features/feed/comments-modal';
import { MemoryCard } from '@/features/feed/memory-card';
import { MemoryFormModal } from '@/features/feed/memory-form-modal';
import { AudioPreviewProvider } from '@/features/feed/use-audio-preview';
import { useMemories } from '@/features/feed/use-memories';
import { FEED_FILTERS, type FeedFilterKey, type MemoryFormValues, type MemoryId, type MemoryView } from '@/features/feed/types';

export default function FeedScreen() {
  const { user } = useAuth();
  const {
    memories, loading, saving, isConfigured,
    toggleReaction, toggleFavorite, deleteMemory, saveMemory, addComment,
  } = useMemories();

  const [filter, setFilter] = useState<FeedFilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryView | null>(null);
  const [commentsMemoryId, setCommentsMemoryId] = useState<MemoryId | null>(null);

  const filteredMemories = useMemo(() => {
    const byFilter = filter === 'all' ? memories
      : filter === 'fav' ? memories.filter(m => m.fav)
      : memories.filter(m => m.cat === filter);
    const query = searchText.trim().toLowerCase();
    if (!query) return byFilter;
    return byFilter.filter(m =>
      m.title.toLowerCase().includes(query) ||
      (m.loc !== null && m.loc.toLowerCase().includes(query)) ||
      m.desc.toLowerCase().includes(query),
    );
  }, [memories, filter, searchText]);

  const selectedMemory = useMemo(
    () => memories.find(m => m.id === commentsMemoryId) ?? null,
    [memories, commentsMemoryId],
  );

  const openCreateForm = useCallback(() => {
    setEditingMemory(null);
    setIsFormVisible(true);
  }, []);

  const openEditForm = useCallback((memory: MemoryView) => {
    setEditingMemory(memory);
    setIsFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormVisible(false);
    setEditingMemory(null);
  }, []);

  const handleSubmitForm = useCallback(async (values: MemoryFormValues) => {
    const ok = await saveMemory(values, editingMemory?.id ?? null);
    if (ok) closeForm();
  }, [saveMemory, editingMemory, closeForm]);

  const openComments = useCallback((memoryId: MemoryId) => setCommentsMemoryId(memoryId), []);
  const closeComments = useCallback(() => setCommentsMemoryId(null), []);

  const keyExtractor = useCallback((item: MemoryView) => String(item.id), []);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<MemoryView>) => (
    <MemoryCard
      memory={item}
      isCreator={item.by === user?.displayName}
      onOpenComments={openComments}
      onToggleFavorite={toggleFavorite}
      onReact={toggleReaction}
      onEdit={openEditForm}
      onDelete={deleteMemory}
    />
  ), [user?.displayName, openComments, toggleFavorite, toggleReaction, openEditForm, deleteMemory]);

  return (
    <AudioPreviewProvider>
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nossas memórias</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateForm} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {!isConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      <View style={styles.filterRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {FEED_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipOn]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por título, local ou relato..."
          placeholderTextColor="#a69098"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && memories.length === 0 ? (
        <View style={sharedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando memórias...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMemories}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={sharedStyles.emptyState}>
              <Text style={sharedStyles.emptyStateText}>Nenhuma memória cadastrada nesta categoria.</Text>
            </View>
          }
        />
      )}

      <MemoryFormModal
        visible={isFormVisible}
        editing={editingMemory}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <CommentsModal
        memory={selectedMemory}
        onClose={closeComments}
        onAddComment={addComment}
      />
    </View>
    </AudioPreviewProvider>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
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
  warningText: { fontSize: 10.5, color: COLORS.gold, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  filterRowContainer: { backgroundColor: COLORS.bg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filterRow: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 13, gap: 8 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipOn: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12, color: COLORS.muted },
  filterTextOn: { color: COLORS.headerAccent },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.bg },
  searchInput: { height: 38, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, paddingHorizontal: 16, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surface },
  list: { flex: 1 },
  listContent: { paddingBottom: 30 },
  separator: { height: 8, backgroundColor: COLORS.bg },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
});
