import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

/** View-model de uma opção: votos são os usernames ('eu' | 'ela') que votaram nela. */
export interface PollOptionVM {
  id: number;
  text: string;
  votes: string[];
}

export interface PollVM {
  id: number;
  question: string;
  createdBy: number;
  createdAt: string;
  options: PollOptionVM[];
}

interface OptionResult {
  option: PollOptionVM;
  votesCount: number;
  pct: number;
  votedByMe: boolean;
}

interface PollCardProps {
  poll: PollVM;
  currentUsername?: string;
  onVote: (poll: PollVM, option: PollOptionVM) => void;
  onDelete: (pollId: number) => void;
}

export const PollCard = React.memo(function PollCard({ poll, currentUsername, onVote, onDelete }: PollCardProps) {
  const results = useMemo<OptionResult[]>(() => {
    const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
    return poll.options.map(opt => ({
      option: opt,
      votesCount: opt.votes.length,
      pct: totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0,
      votedByMe: currentUsername ? opt.votes.includes(currentUsername) : false,
    }));
  }, [poll, currentUsername]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.questionText}>{poll.question}</Text>
        <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(poll.id)}>
          <Text style={{ fontSize: 13, color: '#bbb' }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionsBox}>
        {results.map(({ option, votesCount, pct, votedByMe }) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionRow, votedByMe && styles.optionRowVoted]}
            onPress={() => onVote(poll, option)}
            activeOpacity={0.7}
          >
            <View style={styles.optionTextRow}>
              <Text style={[styles.optionText, votedByMe && { fontWeight: '600', color: COLORS.accentDeep }]}>
                {option.text}
              </Text>
              <Text style={styles.optionPct}>{pct}% ({votesCount})</Text>
            </View>
            {/* Barra de progresso */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%`, backgroundColor: votedByMe ? COLORS.accent : COLORS.muted + '40' },
                ]}
              />
            </View>
            {/* Avatares de quem votou */}
            <View style={styles.votersRow}>
              {option.votes.map((username, idx) => (
                <View key={`${username}-${idx}`} style={[styles.miniAv, username === 'ela' ? styles.avEla : styles.avEu]}>
                  <Text style={styles.miniAvText}>L</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  questionText: { fontSize: 15.5, fontWeight: 'bold', color: COLORS.text, flex: 1, lineHeight: 22 },
  delBtn: { padding: 4, marginLeft: 10 },

  optionsBox: { gap: 12 },
  optionRow: { padding: 12, borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg, position: 'relative', overflow: 'hidden' },
  optionRowVoted: { borderColor: COLORS.accentSoft, backgroundColor: COLORS.accentSoft + '20' },
  optionTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 },
  optionText: { fontSize: 13.5, color: COLORS.text, fontWeight: '500' },
  optionPct: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  progressBar: { height: 4, backgroundColor: '#efe5e7', borderRadius: 2, marginTop: 8, overflow: 'hidden', zIndex: 5 },
  progressFill: { height: '100%', borderRadius: 2 },

  votersRow: { flexDirection: 'row', gap: 4, marginTop: 6, zIndex: 5, justifyContent: 'flex-end' },
  miniAv: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avEla: { backgroundColor: '#e6b3c5' },
  avEu: { backgroundColor: '#b3c7dd' },
  miniAvText: { fontSize: 8, fontWeight: 'bold' },
});
