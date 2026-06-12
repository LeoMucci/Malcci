// Theme tokens based on the ttL prototype design system
export const COLORS = {
  accent: '#C85A7C',
  accentDeep: '#9E3D5A',
  accentSoft: '#FAE7EF',
  headerBg: '#2a1a22',
  headerText: '#f0e0e8',
  headerSub: '#a78592',
  headerAccent: '#e0a0b6',
  bg: '#faf7f5',
  surface: '#ffffff',
  text: '#2c2622',
  muted: '#9a7a82',
  border: '#ece2dd',
  gold: '#c79a3a',
  goldSoft: '#faf3e2',
  sage: '#6f9573',
  blue: '#6a8fb5',
  violet: '#7a6bb0',
  // Memory type colors
  restaurant: '#b06a4e',
  restaurantTint: '#faece4',
  film: '#6a55b0',
  filmTint: '#eee9fb',
  place: '#477d50',
  placeTint: '#e7f1e8',
  special: '#b04f7c',
  specialTint: '#fae7ef',
  shopping: '#b08a2e',
  shoppingTint: '#faf3e2',
  date: '#b03b57',
  dateTint: '#fae9ec',
  passeio: '#3b91a0',
  passeioTint: '#e7f7fa',
  travel: '#4a7bb0',
  travelTint: '#e8f0f8',
};

export const FONTS = {
  serif: 'CormorantGaramond_400Regular',
  serifItalic: 'CormorantGaramond_400Regular_Italic',
  serifMedium: 'CormorantGaramond_500Medium',
  serifMediumItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 36,
  full: 999,
};

// Memory type metadata matching the ttL prototype
export const MTYPE: Record<string, { label: string; icon: string; color: string; tint: string }> = {
  restaurant: { label: 'restaurante', icon: 'restaurant', color: COLORS.restaurant, tint: COLORS.restaurantTint },
  movie:      { label: 'filme',       icon: 'movie',      color: COLORS.film,       tint: COLORS.filmTint },
  place:      { label: 'lugar',       icon: 'place',      color: COLORS.place,     tint: COLORS.placeTint },
  special:    { label: 'especial',    icon: 'auto-awesome', color: COLORS.special,   tint: COLORS.specialTint },
  shopping:   { label: 'compra',      icon: 'card-giftcard', color: COLORS.shopping, tint: COLORS.shoppingTint },
  date:       { label: 'encontro',    icon: 'favorite',   color: '#b03b57',         tint: '#fae9ec' },
  passeio:    { label: 'passeio',     icon: 'map',        color: '#3b91a0',         tint: '#e7f7fa' },
  travel:     { label: 'viagem',      icon: 'flight',     color: '#4a7bb0',         tint: '#e8f0f8' },
  other:      { label: 'momento',     icon: 'favorite',    color: COLORS.special,    tint: COLORS.specialTint },
};

export const REACTION_SET = ['❤️', '😍', '😂', '🔥', '🥹', '😭'];

export const MOODS = [
  { emoji: '😊', label: 'feliz' },
  { emoji: '🥰', label: 'romântica' },
  { emoji: '😌', label: 'calma' },
  { emoji: '🤩', label: 'animada' },
  { emoji: '😴', label: 'cansada' },
  { emoji: '🙏', label: 'grata' },
];
