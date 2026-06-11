import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CoolThingRow } from '@/types/domain';
import {
  getPriorityMeta,
  STATUS_FILTERS,
  WISHLIST_CATEGORIES,
  type PurchasedFilter,
  type WishlistCategory,
} from '@/features/wishlist/constants';
import { WishlistFormModal, type WishlistFormInput } from '@/features/wishlist/wishlist-form-modal';

export default function WishlistScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<CoolThingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WishlistCategory>('shopping');
  const [filterPurchased, setFilterPurchased] = useState<PurchasedFilter>('pending');
  const [isAdding, setIsAdding] = useState(false);

  const loadItems = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('cool_things')
        .select('*, creator:users(display_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as CoolThingRow[] | null) ?? []);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar a wishlist.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useRealtimeRefresh(['cool_things'], loadItems);

  const handleSubmitItem = useCallback(
    async (input: WishlistFormInput): Promise<boolean> => {
      if (!user) return false;
      try {
        const { error } = await supabase.from('cool_things').insert({
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          price: input.price,
          url: input.url,
          created_by: user.id,
          purchased: false,
        });

        if (error) throw error;
        showToast('Desejo adicionado! 🎁', 'success');
        void loadItems();
        return true;
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível cadastrar o item na Wishlist.'), 'error');
        return false;
      }
    },
    [user, showToast, loadItems],
  );

  const handleTogglePurchased = useCallback(
    async (item: CoolThingRow) => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('cool_things')
          .update({
            purchased: !item.purchased,
            purchased_date: item.purchased ? null : todayStr,
          })
          .eq('id', item.id);

        if (error) throw error;
        if (!item.purchased) showToast('Desejo concluído! 🎉', 'success');
        void loadItems();
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível atualizar o item.'), 'error');
      }
    },
    [showToast, loadItems],
  );

  const handleDeleteItem = useCallback(
    (id: number) => {
      void (async () => {
        const ok = await confirm({
          title: 'Remover item',
          message: 'Deseja realmente excluir esta sugestão?',
          confirmLabel: 'Remover',
          destructive: true,
        });
        if (!ok) return;
        try {
          const { error } = await supabase.from('cool_things').delete().eq('id', id);
          if (error) throw error;
          showToast('Item removido.', 'success');
          void loadItems();
        } catch (e) {
          showToast(getErrorMessage(e, 'Não foi possível excluir o item.'), 'error');
        }
      })();
    },
    [confirm, showToast, loadItems],
  );

  const handleOpenLink = useCallback(
    async (url: string | null) => {
      if (!url) return;
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      try {
        await Linking.openURL(formattedUrl);
      } catch {
        showToast('Não foi possível abrir o link.', 'error');
      }
    },
    [showToast],
  );

  const filteredList = useMemo(
    () =>
      items.filter(item => {
        const matchCategory = item.category === activeTab;
        const matchStatus =
          filterPurchased === 'all' ? true : filterPurchased === 'purchased' ? item.purchased : !item.purchased;
        return matchCategory && matchStatus;
      }),
    [items, activeTab, filterPurchased],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist de Casal</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {WISHLIST_CATEGORIES.map(cat => {
            const isActive = activeTab === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Row (Pending / Purchased) */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(filter => {
          const isActive = filterPurchased === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
              onPress={() => setFilterPurchased(filter.key)}
            >
              <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando desejos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredList.map(item => {
            const prio = getPriorityMeta(item.priority);
            return (
              <View key={item.id} style={[styles.card, item.purchased && styles.cardPurchased]}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.purchased && styles.checkboxActive]}
                    onPress={() => handleTogglePurchased(item)}
                  >
                    {item.purchased && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.cardTitleArea}>
                    <Text style={[styles.itemTitle, item.purchased && styles.itemTitlePurchased]}>{item.title}</Text>
                    {item.price ? <Text style={styles.itemPrice}>R$ {Number(item.price).toFixed(2)}</Text> : null}
                  </View>

                  {!item.purchased && (
                    <View style={[styles.prioBadge, { backgroundColor: prio.bg }]}>
                      <Text style={[styles.prioText, { color: prio.color }]}>{prio.label}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteItem(item.id)}>
                    <Text style={styles.delIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}

                <View style={styles.cardFoot}>
                  <Text style={styles.byText}>Sugerido por {item.creator?.display_name || 'Parceiro'}</Text>
                  {item.url ? (
                    <TouchableOpacity style={styles.linkBtn} onPress={() => handleOpenLink(item.url)}>
                      <Text style={styles.linkBtnText}>Ver Link ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}

          {filteredList.length === 0 && (
            <Text style={styles.empty}>Nenhum item nesta seção. Clique no "+" no topo para sugerir! 🎁</Text>
          )}
        </ScrollView>
      )}

      {/* Add Item Modal Overlay */}
      {isAdding && (
        <WishlistFormModal category={activeTab} onClose={() => setIsAdding(false)} onSubmit={handleSubmitItem} />
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
  backBtn: { paddingVertical: 4 },
  backText: { color: COLORS.headerAccent, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },

  tabsContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tabsScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  tabChipActive: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  tabChipText: { fontSize: 12.5, color: COLORS.muted },
  tabChipTextActive: { color: COLORS.headerAccent, fontWeight: '600' },

  filterRow: { flexDirection: 'row', padding: 8, paddingHorizontal: 16, gap: 6, backgroundColor: COLORS.bg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filterBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  filterBtnActive: { backgroundColor: 'rgba(200, 90, 124, 0.1)' },
  filterBtnText: { fontSize: 11.5, color: COLORS.muted },
  filterBtnTextActive: { color: COLORS.accent, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 80, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 30 },

  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, gap: 8 },
  cardPurchased: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitleArea: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  checkIcon: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  itemTitle: { fontSize: 14.5, fontWeight: '500', color: COLORS.text },
  itemTitlePurchased: { textDecorationLine: 'line-through', color: COLORS.muted },
  itemPrice: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  prioBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  prioText: { fontSize: 10, fontWeight: '600' },
  delBtn: { padding: 4, marginLeft: 6 },
  delIcon: { fontSize: 13, color: '#bbb' },

  itemDesc: { fontSize: 13, color: '#665', lineHeight: 18, paddingLeft: 32 },

  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingLeft: 32 },
  byText: { fontSize: 10.5, color: COLORS.muted },
  linkBtn: { backgroundColor: COLORS.accentSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  linkBtnText: { fontSize: 11, color: COLORS.accentDeep, fontWeight: '500' },
});
