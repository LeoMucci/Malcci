import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import { getErrorMessage } from '@/lib/errors';
import { cleanText, isNonEmpty, LIMITS } from '@/lib/validation';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { PollCard, type PollOptionVM, type PollVM } from '@/features/polls/poll-card';
import type { PollRow } from '@/types/domain';

function mapPollRows(rows: PollRow[]): PollVM[] {
  return rows.map(p => ({
    id: p.id,
    question: p.question,
    createdBy: p.created_by,
    createdAt: p.created_at,
    options: (p.options ?? []).map(opt => ({
      id: opt.id,
      text: opt.option,
      votes: (p.votes ?? [])
        .filter(vote => vote.option_id === opt.id)
        .map(vote => vote.user?.username)
        .filter((username): username is string => typeof username === 'string'),
    })),
  }));
}

export default function PollsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [polls, setPolls] = useState<PollVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Formulário de nova enquete
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');

  const loadPolls = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPolls([]);
      setLoading(false);
      return;
    }

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
      // Supabase infere a relação users como array; em runtime o join to-one retorna objeto.
      setPolls(mapPollRows((data ?? []) as unknown as PollRow[]));
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar as enquetes.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  useRealtimeRefresh(['polls', 'poll_options', 'poll_votes'], loadPolls);

  const closeCompose = useCallback(() => {
    setIsAdding(false);
    setQuestion('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
  }, []);

  const handleCreatePoll = useCallback(async () => {
    if (!user) return;

    const cleanQuestion = cleanText(question, LIMITS.pollQuestion);
    const cleanOpt1 = cleanText(opt1, LIMITS.pollOption);
    const cleanOpt2 = cleanText(opt2, LIMITS.pollOption);
    const cleanOpt3 = cleanText(opt3, LIMITS.pollOption);

    if (!isNonEmpty(cleanQuestion) || !isNonEmpty(cleanOpt1) || !isNonEmpty(cleanOpt2)) {
      showToast('Insira a pergunta e pelo menos duas opções.', 'error');
      return;
    }
    if (!isSupabaseConfigured) {
      showToast('Configure o Supabase no arquivo .env para criar enquetes.', 'info');
      return;
    }

    try {
      // 1. Cria a enquete
      const { data, error: pollErr } = await supabase
        .from('polls')
        .insert({ question: cleanQuestion, created_by: user.id })
        .select()
        .single();

      if (pollErr) throw pollErr;
      const createdPoll = data as PollRow;

      // 2. Cria as opções
      const optionsToInsert = [
        { poll_id: createdPoll.id, option: cleanOpt1 },
        { poll_id: createdPoll.id, option: cleanOpt2 },
        ...(isNonEmpty(cleanOpt3) ? [{ poll_id: createdPoll.id, option: cleanOpt3 }] : []),
      ];

      const { error: optsErr } = await supabase.from('poll_options').insert(optionsToInsert);
      if (optsErr) throw optsErr;

      await sendNotification(
        user.id,
        'suggestion',
        `${user.displayName} criou uma nova enquete! 📊`,
        `Decisão: "${cleanQuestion}"`,
      );

      closeCompose();
      showToast('Enquete criada! 📊', 'success');
      loadPolls();
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível criar a enquete.'), 'error');
    }
  }, [user, question, opt1, opt2, opt3, closeCompose, loadPolls, showToast]);

  const handleVote = useCallback(async (poll: PollVM, option: PollOptionVM) => {
    if (!user) return;

    const votedThis = option.votes.includes(user.username);

    try {
      // 1. Remove qualquer voto anterior deste usuário nesta enquete
      const { error: delErr } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('user_id', user.id);

      if (delErr) throw delErr;

      // 2. Se não for desmarcação, registra o novo voto
      if (!votedThis) {
        const { error: insErr } = await supabase
          .from('poll_votes')
          .insert({ poll_id: poll.id, option_id: option.id, user_id: user.id });

        if (insErr) throw insErr;

        await sendNotification(
          user.id,
          'suggestion',
          `${user.displayName} votou em uma enquete! 📊`,
          `Escolheu "${option.text}" em "${poll.question}"`,
        );
      }

      loadPolls();
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível registrar o voto.'), 'error');
    }
  }, [user, loadPolls, showToast]);

  const handleDeletePoll = useCallback((pollId: number) => {
    void (async () => {
      const ok = await confirm({
        title: 'Apagar enquete',
        message: 'Deseja apagar esta enquete?',
        confirmLabel: 'Apagar',
        destructive: true,
      });
      if (!ok) return;
      try {
        const { error } = await supabase.from('polls').delete().eq('id', pollId);
        if (error) throw error;
        showToast('Enquete apagada.', 'success');
        loadPolls();
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível apagar a enquete.'), 'error');
      }
    })();
  }, [confirm, loadPolls, showToast]);

  const canSubmit = isNonEmpty(question) && isNonEmpty(opt1) && isNonEmpty(opt2);

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
          {polls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUsername={user?.username}
              onVote={handleVote}
              onDelete={handleDeletePoll}
            />
          ))}

          {polls.length === 0 && (
            <Text style={styles.empty}>Nenhuma decisão aberta. Crie uma enquete clicando no "+" no topo! 📊</Text>
          )}
        </ScrollView>
      )}

      {/* Modal de nova enquete */}
      {isAdding && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Criar Enquete</Text>

            <Text style={styles.label}>Pergunta / Decisão</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Qual pizza pedir hoje?"
              maxLength={LIMITS.pollQuestion}
              value={question}
              onChangeText={setQuestion}
            />

            <Text style={styles.label}>Opção 1</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Pepperoni"
              maxLength={LIMITS.pollOption}
              value={opt1}
              onChangeText={setOpt1}
            />

            <Text style={styles.label}>Opção 2</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Quatro Queijos"
              maxLength={LIMITS.pollOption}
              value={opt2}
              onChangeText={setOpt2}
            />

            <Text style={styles.label}>Opção 3 (Opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Calabresa"
              maxLength={LIMITS.pollOption}
              value={opt3}
              onChangeText={setOpt3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeCompose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, !canSubmit && styles.saveDisabled]}
                onPress={handleCreatePoll}
                disabled={!canSubmit}
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

  /* Modal */
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
