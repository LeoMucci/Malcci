import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface CoolThing {
  id: number;
  title: string;
  description?: string;
  category: 'shopping' | 'experience' | 'idea' | 'other';
  priority: 'low' | 'medium' | 'high';
  price?: number;
  url?: string;
  purchased: boolean;
  purchased_date?: string;
  created_by: number;
  created_at: string;
  creator?: {
    display_name: string;
  };
}

const CATEGORIES = [
  { key: 'shopping', label: '🛍️ Compras' },
  { key: 'experience', label: '🎯 Experiências' },
  { key: 'idea', label: '💡 Ideias' },
  { key: 'other', label: '📝 Outros' },
];

const PRIORITIES = {
  high: { label: 'Alta', color: '#ff4d4f', bg: '#fff0f6' },
  medium: { label: 'Média', color: '#faad14', bg: '#fffbe6' },
  low: { label: 'Baixa', color: '#52c41a', bg: '#f6ffed' },
};

export default function WishlistScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<CoolThing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shopping' | 'experience' | 'idea' | 'other'>('shopping');
  const [filterPurchased, setFilterPurchased] = useState<'all' | 'pending' | 'purchased'>('pending');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formCategory, setFormCategory] = useState<'shopping' | 'experience' | 'idea' | 'other'>('shopping');
  const [submitting, setSubmitting] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cool_things')
        .select(`
          *,
          creator:users(display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async () => {
    if (!formTitle.trim() || !user) return;
    setSubmitting(true);

    const priceNum = formPrice ? parseFloat(formPrice.replace(',', '.')) : null;

    try {
      const { error } = await supabase
        .from('cool_things')
        .insert({
          title: formTitle,
          description: formDesc || null,
          category: formCategory,
          priority: formPriority,
          price: priceNum,
          url: formUrl || null,
          created_by: user.id,
          purchased: false,
        });

      if (error) throw error;

      resetForm();
      setIsAdding(false);
      loadItems();
    } catch (e) {
      console.error('Failed to create wishlist item:', e);
      Alert.alert('Erro', 'Não foi possível cadastrar o item na Wishlist.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormPrice('');
    setFormUrl('');
    setFormPriority('medium');
    setFormCategory(activeTab);
  };

  const togglePurchased = async (id: number, currentPurchased: boolean) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('cool_things')
        .update({
          purchased: !currentPurchased,
          purchased_date: !currentPurchased ? todayStr : null,
        })
        .eq('id', id);

      if (error) throw error;
      loadItems();
    } catch (e) {
      console.error('Failed to update purchased status:', e);
    }
  };

  const handleDeleteItem = async (id: number) => {
    Alert.alert(
      'Deletar Item',
      'Deseja realmente excluir esta sugestão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cool_things')
                .delete()
                .eq('id', id);

              if (error) throw error;
              loadItems();
            } catch (e) {
              console.error('Failed to delete item:', e);
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(err => {
      console.error('Failed to open link', err);
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    });
  };

  // Filter items
  const filteredList = items.filter(it => {
    const matchCategory = it.category === activeTab;
    const matchStatus = 
      filterPurchased === 'all' ? true :
      filterPurchased === 'purchased' ? it.purchased : !it.purchased;
    return matchCategory && matchStatus;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist de Casal</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => {
            setFormCategory(activeTab);
            setIsAdding(true);
          }} 
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {CATEGORIES.map(cat => {
            const isActive = activeTab === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(cat.key as any)}
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
        <TouchableOpacity
          style={[styles.filterBtn, filterPurchased === 'pending' && styles.filterBtnActive]}
          onPress={() => setFilterPurchased('pending')}
        >
          <Text style={[styles.filterBtnText, filterPurchased === 'pending' && styles.filterBtnTextActive]}>Desejos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterPurchased === 'purchased' && styles.filterBtnActive]}
          onPress={() => setFilterPurchased('purchased')}
        >
          <Text style={[styles.filterBtnText, filterPurchased === 'purchased' && styles.filterBtnTextActive]}>Comprados/Concluídos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterPurchased === 'all' && styles.filterBtnActive]}
          onPress={() => setFilterPurchased('all')}
        >
          <Text style={[styles.filterBtnText, filterPurchased === 'all' && styles.filterBtnTextActive]}>Todos</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando desejos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredList.map(item => {
            const prio = PRIORITIES[item.priority] || PRIORITIES.medium;
            return (
              <View key={item.id} style={[styles.card, item.purchased && styles.cardPurchased]}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.purchased && styles.checkboxActive]}
                    onPress={() => togglePurchased(item.id, item.purchased)}
                  >
                    {item.purchased && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, item.purchased && styles.itemTitlePurchased]}>
                      {item.title}
                    </Text>
                    {item.price ? (
                      <Text style={styles.itemPrice}>R$ {Number(item.price).toFixed(2)}</Text>
                    ) : null}
                  </View>

                  {!item.purchased && (
                    <View style={[styles.prioBadge, { backgroundColor: prio.bg }]}>
                      <Text style={[styles.prioText, { color: prio.color }]}>{prio.label}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteItem(item.id)}>
                    <Text style={{ fontSize: 13, color: '#bbb' }}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {item.description ? (
                  <Text style={styles.itemDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.cardFoot}>
                  <Text style={styles.byText}>
                    Sugerido por {item.creator?.display_name || 'Parceiro'}
                  </Text>
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
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Adicionar Desejo</Text>

            <Text style={styles.label}>O que vocês querem?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Cafeteira Italiana, Jantar no restaurante X..."
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.label}>Descrição / Detalhes</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 50, textAlignVertical: 'top' }]}
              placeholder="Ex: Cor preta, de preferência marca Y"
              multiline
              numberOfLines={2}
              value={formDesc}
              onChangeText={setFormDesc}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Preço Estimado</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="R$ 150.00"
                  keyboardType="numeric"
                  value={formPrice}
                  onChangeText={setFormPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Categoria</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: '#f5f5f5', color: '#999' }]}
                  value={CATEGORIES.find(c => c.key === formCategory)?.label.split(' ')[1]}
                  editable={false}
                />
              </View>
            </View>

            <Text style={styles.label}>Link (Opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: amazon.com.br/produto..."
              value={formUrl}
              onChangeText={setFormUrl}
            />

            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.typeGrid}>
              {[
                { k: 'low', label: 'Baixa 🟢' },
                { k: 'medium', label: 'Média 🟡' },
                { k: 'high', label: 'Alta 🔴' },
              ].map(prio => (
                <TouchableOpacity
                  key={prio.k}
                  style={[styles.typeButton, formPriority === prio.k && styles.typeButtonSelected]}
                  onPress={() => setFormPriority(prio.k as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeButtonText, formPriority === prio.k && styles.typeButtonTextSelected]}>
                    {prio.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, (!formTitle.trim() || submitting) && styles.saveDisabled]}
                onPress={handleAddItem}
                disabled={!formTitle.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Sugerir</Text>
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
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  checkIcon: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  itemTitle: { fontSize: 14.5, fontWeight: '500', color: COLORS.text },
  itemTitlePurchased: { textDecorationLine: 'line-through', color: COLORS.muted },
  itemPrice: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  prioBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  prioText: { fontSize: 10, fontWeight: '600' },
  delBtn: { padding: 4, marginLeft: 6 },

  itemDesc: { fontSize: 13, color: '#665', lineHeight: 18, paddingLeft: 32 },

  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingLeft: 32 },
  byText: { fontSize: 10.5, color: COLORS.muted },
  linkBtn: { backgroundColor: COLORS.accentSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  linkBtnText: { fontSize: 11, color: COLORS.accentDeep, fontWeight: '500' },

  /* Modal styles */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 12, backgroundColor: COLORS.bg, width: '100%' },
  row: { flexDirection: 'row' },

  typeGrid: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  typeButton: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent, fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
