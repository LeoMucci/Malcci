// Constantes e helpers da Wishlist de Casal.

export type WishlistCategory = 'shopping' | 'experience' | 'idea' | 'other';
export type WishlistPriority = 'low' | 'medium' | 'high';
export type PurchasedFilter = 'all' | 'pending' | 'purchased';

export interface PriorityMeta {
  label: string;
  color: string;
  bg: string;
}

export const WISHLIST_CATEGORIES: ReadonlyArray<{ key: WishlistCategory; label: string }> = [
  { key: 'shopping', label: '🛍️ Compras' },
  { key: 'experience', label: '🎯 Experiências' },
  { key: 'idea', label: '💡 Ideias' },
  { key: 'other', label: '📝 Outros' },
];

export const PRIORITY_META: Record<WishlistPriority, PriorityMeta> = {
  high: { label: 'Alta', color: '#ff4d4f', bg: '#fff0f6' },
  medium: { label: 'Média', color: '#faad14', bg: '#fffbe6' },
  low: { label: 'Baixa', color: '#52c41a', bg: '#f6ffed' },
};

export const PRIORITY_OPTIONS: ReadonlyArray<{ key: WishlistPriority; label: string }> = [
  { key: 'low', label: 'Baixa 🟢' },
  { key: 'medium', label: 'Média 🟡' },
  { key: 'high', label: 'Alta 🔴' },
];

export const STATUS_FILTERS: ReadonlyArray<{ key: PurchasedFilter; label: string }> = [
  { key: 'pending', label: 'Desejos' },
  { key: 'purchased', label: 'Comprados/Concluídos' },
  { key: 'all', label: 'Todos' },
];

export function getPriorityMeta(priority: string | null): PriorityMeta {
  if (priority && priority in PRIORITY_META) return PRIORITY_META[priority as WishlistPriority];
  return PRIORITY_META.medium;
}

export function getCategoryLabel(category: WishlistCategory): string {
  return WISHLIST_CATEGORIES.find(c => c.key === category)?.label ?? '📝 Outros';
}
