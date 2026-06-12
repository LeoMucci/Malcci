// Modal de criação/edição de memória — visual cuidado e campos que se adaptam
// ao tipo escolhido (restaurante, filme, lugar, especial, compra).

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, MTYPE, RADIUS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useToast } from '@/components/ui/toast';
import { isNonEmpty, LIMITS } from '@/lib/validation';
import DatePicker from '@/components/DatePicker';
import LocationSearch from '@/components/LocationSearch';
import MusicSearch, { type SelectedTrackMeta } from '@/components/MusicSearch';
import type { MemoryType } from '@/types/domain';
import type { PickedPhoto } from './picked-photo';
import type { MemoryFormValues, MemoryView } from './types';

interface TypeConfig {
  icon: string;
  label: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  showRating: boolean;
  showLocation: boolean;
  locationLabel: string;
  ratingLabel: string;
}

// Ordem e campos por tipo. A cor/tint do tipo (MTYPE) tematiza o topo do modal.
const TYPE_CONFIG: Record<MemoryType, TypeConfig> = {
  restaurant: {
    icon: '🍽️', label: 'Restaurante',
    titlePlaceholder: 'Nome do restaurante',
    descLabel: 'O que comeram?', descPlaceholder: 'Pratos, atendimento, o que acharam…',
    showRating: true, ratingLabel: 'Quantas estrelas?',
    showLocation: true, locationLabel: 'Onde fica',
  },
  movie: {
    icon: '🎬', label: 'Filme / Série',
    titlePlaceholder: 'Nome do filme ou série',
    descLabel: 'O que acharam?', descPlaceholder: 'Choraram? Riram? Recomendam?',
    showRating: true, ratingLabel: 'Nota de vocês',
    showLocation: false, locationLabel: '',
  },
  place: {
    icon: '📍', label: 'Lugar',
    titlePlaceholder: 'Que lugar é esse?',
    descLabel: 'Como foi a visita?', descPlaceholder: 'O que rolou por lá…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Localização',
  },
  travel: {
    icon: '✈️', label: 'Viagem',
    titlePlaceholder: 'Para onde viajaram?',
    descLabel: 'Como foi a viagem?', descPlaceholder: 'O que rolou por lá, hotéis, passeios…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Destino',
  },
  special: {
    icon: '💖', label: 'Especial',
    titlePlaceholder: 'O que rolou de especial?',
    descLabel: 'Conta tudo', descPlaceholder: 'Esse momento que vocês querem guardar pra sempre…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Onde foi (opcional)',
  },
  shopping: {
    icon: '🛍️', label: 'Compra',
    titlePlaceholder: 'O que compraram?',
    descLabel: 'Por que é especial?', descPlaceholder: 'Detalhes da compra…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Onde compraram (opcional)',
  },
  date: {
    icon: '🌹', label: 'Encontro',
    titlePlaceholder: 'Onde foi o encontro?',
    descLabel: 'Como foi?', descPlaceholder: 'O que fizeram, o que comeram, como foi passar esse tempo juntos…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Local',
  },
  passeio: {
    icon: '🗺️', label: 'Passeio',
    titlePlaceholder: 'Para onde passearam?',
    descLabel: 'O que rolou no passeio?', descPlaceholder: 'Histórias, fotos engraçadas, o que visitaram…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Localização',
  },
  other: {
    icon: '✨', label: 'Momento',
    titlePlaceholder: 'Dê um título',
    descLabel: 'Relato', descPlaceholder: 'Conta como foi…',
    showRating: false, ratingLabel: '',
    showLocation: true, locationLabel: 'Local (opcional)',
  },
};

const FORM_TYPES: MemoryType[] = ['restaurant', 'movie', 'place', 'travel', 'special', 'shopping', 'date', 'passeio'];

const RATING_STARS = [1, 2, 3, 4, 5];
const DEFAULT_TYPE: MemoryType = 'special';
const DEFAULT_RATING = 5;

function formatToYmd(dateOrString?: string | Date): string {
  if (!dateOrString) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateOrString);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (month < 1 || month > 12) return false;
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day;
}

function isVideoUri(uri: string): boolean {
  const lowercase = uri.toLowerCase();
  return (
    lowercase.endsWith('.mp4') ||
    lowercase.endsWith('.mov') ||
    lowercase.endsWith('.m4v') ||
    lowercase.endsWith('.3gp') ||
    lowercase.includes('video') ||
    (uri.startsWith('blob:') && uri.includes('video'))
  );
}

const WEB_FILE_INPUT_STYLE: React.CSSProperties = { display: 'none' };
const WEB_FILE_LABEL_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  backgroundColor: COLORS.bg, borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.accent,
  padding: 14, borderRadius: RADIUS.sm, cursor: 'pointer', fontSize: 13.5, color: COLORS.accentDeep,
  fontWeight: 600, width: '100%',
};

interface MemoryFormModalProps {
  visible: boolean;
  editing: MemoryView | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: MemoryFormValues) => void;
}

export function MemoryFormModal({ visible, editing, saving, onClose, onSubmit }: MemoryFormModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MemoryType>(DEFAULT_TYPE);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState(DEFAULT_RATING);
  const [spotifyTrack, setSpotifyTrack] = useState('');
  const [spotifyArtist, setSpotifyArtist] = useState('');
  const [spotifyPreviewUrl, setSpotifyPreviewUrl] = useState('');
  const [spotifyAlbumArt, setSpotifyAlbumArt] = useState('');
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PickedPhoto[]>([]);
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(editing?.title ?? '');
    setType((editing?.cat ?? DEFAULT_TYPE) as MemoryType);
    setDescription(editing?.desc ?? '');
    setLocation(editing?.loc ?? '');
    setLatitude(null);
    setLongitude(null);
    setRating(editing && editing.stars > 0 ? editing.stars : DEFAULT_RATING);
    setSpotifyTrack(editing?.spotify?.track ?? '');
    setSpotifyArtist(editing?.spotify?.artist ?? '');
    setSpotifyPreviewUrl(editing?.spotify?.previewUrl ?? '');
    setSpotifyAlbumArt(editing?.spotify?.albumArt ?? '');
    setExistingUrls(editing?.photos ?? []);
    setNewPhotos([]);
    setDate(editing?.createdAt ? formatToYmd(editing.createdAt) : formatToYmd());
  }, [visible, editing]);

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
  const theme = MTYPE[type] ?? MTYPE.other;

  // Web: arquivos do <input type=file>.
  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setNewPhotos(prev => [...prev, ...files.map(file => ({ uri: URL.createObjectURL(file), file }))]);
    event.target.value = '';
  };

  // Nativo: abre a galeria do celular (seleção múltipla).
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('Precisamos da permissão da galeria para adicionar fotos ou vídeos.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      setNewPhotos(prev => [
        ...prev,
        ...result.assets.map(a => ({ uri: a.uri, base64: a.base64, mimeType: a.mimeType, fileName: a.fileName })),
      ]);
    } catch {
      showToast('Não foi possível abrir a galeria.', 'error');
    }
  };

  const removeExisting = (index: number) => setExistingUrls(prev => prev.filter((_, i) => i !== index));
  const removeNew = (index: number) => setNewPhotos(prev => prev.filter((_, i) => i !== index));

  const handleSelectTrack = (track: string, artist: string, meta?: SelectedTrackMeta) => {
    setSpotifyTrack(track);
    setSpotifyArtist(artist);
    setSpotifyPreviewUrl(meta?.previewUrl ?? '');
    setSpotifyAlbumArt(meta?.albumArt ?? '');
  };

  const handleSubmit = () => {
    const dateTrimmed = date.trim();
    if (!isValidDate(dateTrimmed)) {
      showToast('Insira uma data válida no formato AAAA-MM-DD (Ex: 2026-06-12).', 'error');
      return;
    }
    onSubmit({
      title, type, description,
      location: cfg.showLocation ? location : '',
      latitude: cfg.showLocation ? latitude : null,
      longitude: cfg.showLocation ? longitude : null,
      rating, spotifyTrack, spotifyArtist, spotifyPreviewUrl, spotifyAlbumArt,
      photoUrls: existingUrls,
      pickedPhotos: newPhotos,
      date: dateTrimmed,
    });
  };

  const canSave = isNonEmpty(title) && isNonEmpty(date) && !saving;
  const totalPhotos = existingUrls.length + newPhotos.length;
  const photoThumbs = useMemo(() => existingUrls.map(url => ({ key: url, uri: url })), [existingUrls]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sharedStyles.modalOverlay}>
        <View style={styles.card}>
          {/* Cabeçalho tematizado pelo tipo */}
          <View style={[styles.headerBar, { backgroundColor: theme.tint }]}>
            <Text style={styles.headerEmoji}>{cfg.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerKicker}>{editing ? 'Editando' : 'Nova memória'}</Text>
              <Text style={[styles.headerTitle, { color: theme.color }]}>{cfg.label}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8} activeOpacity={0.6}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Seletor de tipo */}
            <Text style={styles.sectionLabel}>Tipo de memória</Text>
            <View style={styles.typeRow}>
              {FORM_TYPES.map(key => {
                const c = TYPE_CONFIG[key];
                const active = type === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeChip, active && { backgroundColor: MTYPE[key].color, borderColor: MTYPE[key].color }]}
                    onPress={() => setType(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.typeChipIcon}>{c.icon}</Text>
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Título */}
            <Text style={styles.sectionLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder={cfg.titlePlaceholder}
              placeholderTextColor="#b6a3aa"
              value={title}
              onChangeText={setTitle}
              maxLength={LIMITS.title}
            />

             {/* Data da Memória */}
             <Text style={styles.sectionLabel}>📅 Data da memória *</Text>
             <DatePicker
               value={date}
               onChange={setDate}
               placeholder="Selecionar data"
             />

            {/* Avaliação (só restaurante/filme) */}
            {cfg.showRating && (
              <>
                <Text style={styles.sectionLabel}>{cfg.ratingLabel}</Text>
                <View style={styles.starsRow}>
                  {RATING_STARS.map(star => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} hitSlop={4}>
                      <Text style={[styles.star, { color: star <= rating ? '#f0b429' : COLORS.border }]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Relato */}
            <Text style={styles.sectionLabel}>{cfg.descLabel}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={cfg.descPlaceholder}
              placeholderTextColor="#b6a3aa"
              multiline
              value={description}
              onChangeText={setDescription}
              maxLength={LIMITS.description}
            />

            {/* Localização (oculta para filme) */}
            {cfg.showLocation && (
              <>
                <Text style={styles.sectionLabel}>📍 {cfg.locationLabel}</Text>
                <LocationSearch
                  locationText={location}
                  onSelect={(selectedLocation, lat, lng) => {
                    setLocation(selectedLocation);
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </>
            )}

            {/* Trilha sonora */}
            <Text style={styles.sectionLabel}>🎵 Trilha sonora</Text>
            <MusicSearch trackName={spotifyTrack} artistName={spotifyArtist} onSelect={handleSelectTrack} />

            {/* Fotos e Vídeos */}
            <Text style={styles.sectionLabel}>📸 Fotos e Vídeos {totalPhotos > 0 ? `· ${totalPhotos}` : ''}</Text>
            {totalPhotos > 0 && (
              <View style={styles.thumbGrid}>
                {photoThumbs.map((p, index) => (
                  <View key={`e-${index}-${p.key}`} style={styles.thumbWrap}>
                    {isVideoUri(p.uri) ? (
                      <View style={[styles.thumb, styles.videoThumb]}>
                        <Text style={styles.videoPlayIcon}>▶️</Text>
                        <Text style={styles.videoLabel}>Vídeo</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
                    )}
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeExisting(index)} activeOpacity={0.7}>
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </TouchableOpacity>
                    {index === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>capa</Text></View>}
                  </View>
                ))}
                {newPhotos.map((photo, index) => (
                  <View key={`n-${index}`} style={styles.thumbWrap}>
                    {isVideoUri(photo.uri) ? (
                      <View style={[styles.thumb, styles.videoThumb]}>
                        <Text style={styles.videoPlayIcon}>▶️</Text>
                        <Text style={styles.videoLabel}>Vídeo</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
                    )}
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeNew(index)} activeOpacity={0.7}>
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </TouchableOpacity>
                    {existingUrls.length === 0 && index === 0 && (
                      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>capa</Text></View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {Platform.OS === 'web' ? (
              <View>
                <input type="file" accept="image/*,video/*" multiple onChange={handlePickFiles} style={WEB_FILE_INPUT_STYLE} id="file-upload-input" />
                <label htmlFor="file-upload-input" style={WEB_FILE_LABEL_STYLE}>📸 Adicionar fotos/vídeos</label>
              </View>
            ) : (
              <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} activeOpacity={0.7}>
                <Text style={styles.galleryBtnText}>📸 Escolher da galeria</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Rodapé fixo */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Salvar' : 'Publicar'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', overflow: 'hidden' },
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
  headerEmoji: { fontSize: 30 },
  headerKicker: { fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.muted, fontWeight: '600' },
  headerTitle: { fontSize: 21, fontWeight: '700', fontStyle: 'italic' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  body: { paddingHorizontal: 18 },
  bodyContent: { paddingTop: 14, paddingBottom: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 14 },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  typeChipIcon: { fontSize: 15 },
  typeChipText: { fontSize: 12.5, color: COLORS.muted, fontWeight: '500' },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },

  input: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5, color: COLORS.text },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 },

  starsRow: { flexDirection: 'row', gap: 10 },
  star: { fontSize: 34 },

  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg },
  thumbRemove: { position: 'absolute', top: -7, right: -7, width: 23, height: 23, borderRadius: 12, backgroundColor: COLORS.accentDeep, alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  coverBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(20,10,15,0.65)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  galleryBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.accent, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.bg },
  galleryBtnText: { color: COLORS.accentDeep, fontSize: 13.5, fontWeight: '600' },
  videoThumb: { backgroundColor: '#F0EAF0', justifyContent: 'center', alignItems: 'center' },
  videoPlayIcon: { fontSize: 24 },
  videoLabel: { fontSize: 10, color: COLORS.muted, marginTop: 4 },

  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg, alignItems: 'center' },
  cancelText: { fontSize: 14.5, color: COLORS.muted, fontWeight: '500' },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: RADIUS.sm, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: COLORS.accentSoft },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
