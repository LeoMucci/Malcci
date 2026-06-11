// Constantes e helpers do Sorteador de Atividades.

export type ActivityCategoryKey = 'date' | 'home' | 'adventure' | 'relax' | 'food' | 'culture' | 'sport' | 'other';
export type ActivityDifficultyKey = 'easy' | 'medium' | 'hard';

export interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
}

export interface DifficultyMeta {
  label: string;
  color: string;
}

export const ACTIVITY_CATEGORIES: Record<ActivityCategoryKey, CategoryMeta> = {
  date: { label: 'Encontro fora', emoji: '👩‍❤️‍👨', color: '#ffb3ba' },
  home: { label: 'Em casa', emoji: '🏠', color: '#caffbf' },
  adventure: { label: 'Aventura', emoji: '⛰️', color: '#ffd6a5' },
  relax: { label: 'Relaxar', emoji: '☕', color: '#bdb2ff' },
  food: { label: 'Comer', emoji: '🍕', color: '#ffc6ff' },
  culture: { label: 'Cultura', emoji: '🎨', color: '#a0c4ff' },
  sport: { label: 'Esportes', emoji: '🚴', color: '#fdffb6' },
  other: { label: 'Outro', emoji: '✨', color: '#eef1e6' },
};

export const ACTIVITY_DIFFICULTIES: Record<ActivityDifficultyKey, DifficultyMeta> = {
  easy: { label: 'Fácil', color: '#52c41a' },
  medium: { label: 'Médio', color: '#faad14' },
  hard: { label: 'Difícil', color: '#ff4d4f' },
};

export const ACTIVITY_CATEGORY_KEYS = Object.keys(ACTIVITY_CATEGORIES) as ActivityCategoryKey[];
export const ACTIVITY_DIFFICULTY_KEYS = Object.keys(ACTIVITY_DIFFICULTIES) as ActivityDifficultyKey[];

export function getCategoryMeta(category: string | null | undefined): CategoryMeta {
  if (category && category in ACTIVITY_CATEGORIES) return ACTIVITY_CATEGORIES[category as ActivityCategoryKey];
  return ACTIVITY_CATEGORIES.other;
}

export function getDifficultyMeta(difficulty: string | null | undefined): DifficultyMeta {
  if (difficulty && difficulty in ACTIVITY_DIFFICULTIES) {
    return ACTIVITY_DIFFICULTIES[difficulty as ActivityDifficultyKey];
  }
  return ACTIVITY_DIFFICULTIES.medium;
}
