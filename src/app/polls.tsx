import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import { router } from 'expo-router';

interface Option {
  id: number;
  text: string;
  votes: string[]; // usernames that voted, e.g. ['eu', 'ela']
}

interface Poll {
  id: string;
  question: string;
  options: Option[];
  created_at: string;
  created_by: number;
}

export default function PollsScreen() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');

  const loadPolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          id,
          question,
          created_by,
          created_at,
          options:poll_options(id, option),
          votes:poll_votes(id, option_id, user_id, user:users(username))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedPolls = data.map(p => {
          return {
            id: String(p.id),
            question: p.question,
            options: (p.options || []).map((opt: any) => {
              // Get all usernames that voted for this option
              const optionVotes = (p.votes || [])
                .filter((v: any) => v.option_id === opt.id)
                .map((v: any) => v.user?.username); // 'eu' or 'ela'
              return {
                id: opt.id,
                text: opt.option,
                votes: optionVotes,
              };
            }),
            created_at: p.created_at,
            created_by: p.created_by,
          };
        });
        setPolls(mappedPolls);
      }
    } catch (e) {
      console.error('Failed to load polls:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, [user]);

  const handleCreatePoll = async () => {
    if (!question.trim() || !opt1.trim() || !opt2.trim() || !user) {
      Alert.alert('Erro', 'Insira a pergunta e pelo menos duas opções.');
      return;
    }

    try {
      // 1. Insert poll
      const { data: pollData, error: pollErr } = await supabase
        .from('polls')
        .insert({
          question: question.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (pollErr) throw pollErr;

      // 2. Insert options
      const optionsToInsert = [
        { poll_id: pollData.id, option: opt1.trim() },
        { poll_id: pollData.id, option: opt2.trim() },
      ];
      if (opt3.trim()) {
        optionsToInsert.push({ poll_id: pollData.id, option: opt3.trim() });
      }

      const { error: optsErr } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optsErr) throw optsErr;

      // Trigger notification
      await sendNotification(
        user.id,
        'suggestion',
        `${user.displayName} criou uma nova enquete! 📊`,
        `Decisão: "${question.trim()}"`
      );

      // Reset
      setQuestion('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      setIsAdding(false);
      loadPolls();
    } catch (e) {
      console.error('Failed to create poll:', e);
      Alert.alert('Erro', 'Não foi possível criar a enquete.');
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    const selectedOption = poll.options[optionIndex];
    const numericPollId = parseInt(pollId);
    
    // Check if user has already voted for this specific option
    const votedThis = selectedOption.votes.includes(user.username);

    try {
      // 1. Delete any existing vote by this user for this poll
      const { error: delErr } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', numericPollId)
        .eq('user_id', user.id);

      if (delErr) throw delErr;

      // 2. If not toggling off, insert the new vote
      if (!votedThis) {
        const { error: insErr } = await supabase
          .from('poll_votes')
          .insert({
            poll_id: numericPollId,
            option_id: selectedOption.id,
            user_id: user.id,
          });

        if (insErr) throw insErr;

        // Trigger notification
        await sendNotification(
          user.id,
          'suggestion',
          `${user.displayName} votou em uma enquete! 📊`,
          `Escolheu "${selectedOption.text}" em "${poll.question}"`
        );
      }

      loadPolls();
    } catch (e) {
      console.error('Failed to vote:', e);
    }
  };

  const handleDeletePoll = async (id: string) => {
    Alert.alert(
      'Deletar Enquete',
      'Deseja apagar esta enquete?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('polls')
                .delete()
                .eq('id', parseInt(id));

              if (error) throw error;
              loadPolls();
            } catch (e) {
              console.error('Failed to delete poll:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Decidir Juntos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando enquetes...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {polls.map(poll => {
            const totalVotes = poll.options.reduce((acc, curr) => acc + curr.votes.length, 0);

            return (
              <View key={poll.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.questionText}>{poll.question}</Text>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeletePoll(poll.id)}>
                    <Text style={{ fontSize: 13, color: '#bbb' }}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsBox}>
                  {poll.options.map((opt, idx) => {
                    const votesCount = opt.votes.length;
                    const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                    const votedThis = user ? opt.votes.includes(user.username) : false;

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionRow, votedThis && styles.optionRowVoted]}
                        onPress={() => handleVote(poll.id, idx)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionTextRow}>
                          <Text style={[styles.optionText, votedThis && { fontWeight: '600', color: COLORS.accentDeep }]}>
                            {opt.text}
                          </Text>
                          <Text style={styles.optionPct}>{pct}% ({votesCount})</Text>
                        </View>
                        {/* Progress Bar background */}
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: votedThis ? COLORS.accent : COLORS.muted + '40' }]} />
                        </View>
                        {/* Who voted avatar */}
                        <View style={styles.votersRow}>
                          {opt.votes.map((v, vidx) => (
                            <View key={vidx} style={[styles.miniAv, v === 'ela' ? styles.avEla : styles.avEu]}>
                              <Text style={styles.miniAvText}>{v === 'ela' ? 'L' : 'L'}</Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {polls.length === 0 && (
            <Text style={styles.empty}>Nenhuma decisão aberta. Crie uma enquete clicando no "+" no topo! 📊</Text>
          )}
        </ScrollView>
      )}

      {/* Add Poll Modal Overlay */}
      {isAdding && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Criar Enquete</Text>

            <Text style={styles.label}>Pergunta / Decisão</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Qual pizza pedir hoje?"
              value={question}
              onChangeText={setQuestion}
            />

            <Text style={styles.label}>Opção 1</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Pepperoni"
              value={opt1}
              onChangeText={setOpt1}
            />

            <Text style={styles.label}>Opção 2</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Quatro Queijos"
              value={opt2}
              onChangeText={setOpt2}
            />

            <Text style={styles.label}>Opção 3 (Opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Calabresa"
              value={opt3}
              onChangeText={setOpt3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsAdding(false);
                  setQuestion('');
                  setOpt1('');
                  setOpt2('');
                  setOpt3('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, (!question.trim() || !opt1.trim() || !opt2.trim()) && styles.saveDisabled]}
                onPress={handleCreatePoll}
                disabled={!question.trim() || !opt1.trim() || !opt2.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Criar</Text>
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 80, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 30 },

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

  /* Modal styles */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 12, backgroundColor: COLORS.bg, width: '100%' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
