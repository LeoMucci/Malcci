import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

/** View-model de um recado (Supabase ou mock local). */
export interface Note {
  id: string | number;
  who: 'a' | 'b';
  name: string;
  imp: boolean;
  time: string;
  text: string;
  loved: boolean;
}

interface NoteCardProps {
  note: Note;
  isOwner: boolean;
  onToggleLove: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}

export const NoteCard = React.memo(function NoteCard({ note, isOwner, onToggleLove, onDelete }: NoteCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.noteTop}>
        <View style={[styles.noteAv, note.who === 'a' ? styles.avA : styles.avB]}>
          <Text style={styles.avText}>{note.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.noteWho}>{note.name}</Text>
        {note.imp && <Text style={styles.noteImp}>★</Text>}
        <Text style={styles.noteTime}>{note.time}</Text>
      </View>
      <Text style={styles.noteText}>{note.text}</Text>
      <View style={styles.noteFoot}>
        <TouchableOpacity style={styles.noteHeart} onPress={() => onToggleLove(note.id)} activeOpacity={0.7}>
          <Text style={{ fontSize: 14, color: note.loved ? COLORS.accent : COLORS.muted }}>
            {note.loved ? '♥' : '♡'}
          </Text>
          <Text style={{ fontSize: 12, color: note.loved ? COLORS.accent : COLORS.muted }}>
            {note.loved ? 'amei' : 'curtir'}
          </Text>
        </TouchableOpacity>

        {/* Apenas o autor pode apagar */}
        {isOwner && (
          <TouchableOpacity style={styles.noteDel} onPress={() => onDelete(note.id)} activeOpacity={0.7}>
            <Text style={{ fontSize: 15, color: '#c9b0b8' }}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
  noteDel: { marginLeft: 'auto', padding: 3 },
});
