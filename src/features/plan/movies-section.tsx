import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sharedStyles } from '@/constants/shared-styles';
import { COLORS, RADIUS } from '@/constants/theme';
import { LIMITS } from '@/lib/validation';
import { PlanModal, planFeatureStyles } from './plan-modal';
import type { Movie, MovieFormData, MovieKind } from './types';

const STAR_VALUES = [1, 2, 3, 4, 5];

const TYPE_OPTIONS: { key: MovieKind; label: string }[] = [
  { key: 'movie', label: '🎬 Filme' },
  { key: 'series', label: '📺 Série' },
];

type MovieFilter = 'pending' | 'watched';

interface MoviesSectionProps {
  movies: Movie[];
  addModalVisible: boolean;
  onCloseAddModal: () => void;
  onAddMovie: (form: MovieFormData) => Promise<boolean>;
  onMarkWatched: (movie: Movie, rating: number, notes: string) => Promise<boolean>;
  onDeleteMovie: (id: string | number) => void;
}

export function MoviesSection({
  movies,
  addModalVisible,
  onCloseAddModal,
  onAddMovie,
  onMarkWatched,
  onDeleteMovie,
}: MoviesSectionProps) {
  const [filter, setFilter] = useState<MovieFilter>('pending');
  const [searchText, setSearchText] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<MovieKind>('movie');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [watchRating, setWatchRating] = useState(5);
  const [watchNotes, setWatchNotes] = useState('');

  const filteredMovies = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return movies
      .filter(m => (filter === 'watched' ? m.watched : !m.watched))
      .filter(m => (search ? m.title.toLowerCase().includes(search) : true));
  }, [movies, filter, searchText]);

  const handleSubmitAdd = useCallback(async () => {
    const ok = await onAddMovie({ title: formTitle, type: formType });
    if (ok) {
      onCloseAddModal();
      setFormTitle('');
    }
  }, [onAddMovie, onCloseAddModal, formTitle, formType]);

  const closeWatchModal = useCallback(() => {
    setSelectedMovie(null);
    setWatchNotes('');
  }, []);

  const handleSubmitWatch = useCallback(async () => {
    if (!selectedMovie) return;
    const ok = await onMarkWatched(selectedMovie, watchRating, watchNotes);
    if (ok) closeWatchModal();
  }, [selectedMovie, watchRating, watchNotes, onMarkWatched, closeWatchModal]);

  return (
    <View style={styles.sectionGap}>
      {/* Alternador para assistir / assistidos */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, filter === 'pending' && styles.segmentBtnOn]}
          onPress={() => setFilter('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, filter === 'pending' && styles.segmentTextOn]}>Para Assistir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, filter === 'watched' && styles.segmentBtnOn]}
          onPress={() => setFilter('watched')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, filter === 'watched' && styles.segmentTextOn]}>Assistidos</Text>
        </TouchableOpacity>
      </View>

      {/* Busca */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar filme ou série por nome..."
          placeholderTextColor="#a69098"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Lista */}
      {filteredMovies.map(movie => (
        <View key={movie.id} style={styles.movieCardContainer}>
          <View style={styles.movieCard}>
            {!movie.watched ? (
              <TouchableOpacity
                style={styles.movieCheck}
                onPress={() => setSelectedMovie(movie)}
                activeOpacity={0.7}
              />
            ) : (
              <View style={[styles.movieCheck, styles.movieCheckDone]}>
                <Text style={styles.movieCheckTick}>✓</Text>
              </View>
            )}

            <View style={styles.flex1}>
              <Text style={[styles.movieName, movie.watched && styles.movieNameWatched]}>{movie.title}</Text>
              {movie.watched && movie.rating ? (
                <View style={styles.starsLine}>
                  {Array.from({ length: movie.rating }).map((_, i) => (
                    <Text key={i} style={styles.starSmall}>★</Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.movieType}>
              <Text style={styles.movieTypeText}>{movie.type === 'movie' ? 'Filme' : 'Série'}</Text>
            </View>

            <TouchableOpacity
              style={styles.delBtn}
              onPress={() => onDeleteMovie(movie.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.delIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>

          {movie.watched && movie.notes ? (
            <View style={styles.movieReviewNote}>
              <Text style={styles.movieReviewLabel}>Opinião do casal:</Text>
              <Text style={styles.movieReviewText}>"{movie.notes}"</Text>
            </View>
          ) : null}
        </View>
      ))}

      {filteredMovies.length === 0 && (
        <Text style={planFeatureStyles.emptyText}>Nenhum filme nesta lista ainda.</Text>
      )}

      {/* Modal: sugerir filme/série */}
      <PlanModal
        visible={addModalVisible}
        title="Sugerir Filme/Série"
        confirmLabel="Sugerir"
        onCancel={onCloseAddModal}
        onConfirm={handleSubmitAdd}
      >
        <Text style={sharedStyles.label}>Título</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Oppenheimer"
          value={formTitle}
          onChangeText={setFormTitle}
          maxLength={LIMITS.title}
        />

        <Text style={sharedStyles.label}>Tipo</Text>
        <View style={planFeatureStyles.typeGrid}>
          {TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[planFeatureStyles.typeButton, formType === option.key && planFeatureStyles.typeButtonSelected]}
              onPress={() => setFormType(option.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  planFeatureStyles.typeButtonText,
                  formType === option.key && planFeatureStyles.typeButtonTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PlanModal>

      {/* Modal: marcar como assistido */}
      <PlanModal
        visible={selectedMovie !== null}
        title="Marcar como Assistido"
        confirmLabel="Concluir"
        onCancel={closeWatchModal}
        onConfirm={handleSubmitWatch}
      >
        <Text style={styles.watchLabel}>{selectedMovie?.title ?? ''}</Text>

        <Text style={sharedStyles.label}>Avaliação (1-5 estrelas)</Text>
        <View style={styles.starsRow}>
          {STAR_VALUES.map(star => (
            <TouchableOpacity key={star} onPress={() => setWatchRating(star)} activeOpacity={0.7}>
              <Text style={[styles.starBig, star <= watchRating && styles.starBigOn]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={sharedStyles.label}>O que acharam?</Text>
        <TextInput
          style={[sharedStyles.input, styles.notesInput]}
          placeholder="O filme foi bom? Algum comentário sobre?"
          multiline
          numberOfLines={3}
          value={watchNotes}
          onChangeText={setWatchNotes}
          maxLength={LIMITS.description}
        />
      </PlanModal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: 16 },
  flex1: { flex: 1 },

  segmentRow: { flexDirection: 'row', backgroundColor: '#efe5e7', borderRadius: 20, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: 'center' },
  segmentBtnOn: { backgroundColor: COLORS.surface },
  segmentText: { fontSize: 12.5, color: COLORS.muted, fontWeight: '500' },
  segmentTextOn: { color: COLORS.text, fontWeight: '600' },

  searchWrap: { paddingHorizontal: 2, marginBottom: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },

  movieCardContainer: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  movieCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  movieCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, cursor: 'pointer' },
  movieCheckDone: { backgroundColor: COLORS.sage, borderColor: COLORS.sage, alignItems: 'center', justifyContent: 'center' },
  movieCheckTick: { color: '#fff', fontSize: 10 },
  movieName: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1 },
  movieNameWatched: { color: COLORS.muted },
  starsLine: { flexDirection: 'row', gap: 2, marginTop: 4 },
  starSmall: { fontSize: 11, color: '#ffd479' },
  movieType: { backgroundColor: COLORS.accentSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  movieTypeText: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.muted },
  movieReviewNote: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 8 },
  movieReviewLabel: { fontSize: 10.5, fontWeight: '600', color: COLORS.accentDeep, marginBottom: 2 },
  movieReviewText: { fontSize: 12.5, fontStyle: 'italic', color: '#7a646a' },

  delBtn: { marginLeft: 10 },
  delIcon: { fontSize: 13, color: '#c9b0b8' },

  watchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 14, textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBig: { fontSize: 32, color: COLORS.border },
  starBigOn: { color: '#ffd479' },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
});
