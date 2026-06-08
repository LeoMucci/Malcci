import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Image, Alert, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS, MTYPE } from '@/constants/theme';
import { COUPLE, NOTIFS } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getRelationshipStats(startDate: Date) {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  let days = today.getDate() - startDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // Next anniversary calculation
  const nextAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (today > nextAnniversary) {
    nextAnniversary.setFullYear(today.getFullYear() + 1);
  }
  const diffAnniv = nextAnniversary.getTime() - today.getTime();
  const nextInDays = Math.ceil(diffAnniv / (1000 * 60 * 60 * 24));

  return {
    days: diffDays,
    years,
    months,
    restDays: days,
    nextIn: nextInDays,
  };
}

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

export default function HomeScreen() {
  const { user } = useAuth();

  const [startDateStr, setStartDateStr] = useState('2024-12-06');
  const [stats, setStats] = useState({ days: 0, years: 0, months: 0, restDays: 0, nextIn: 0 });
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDateInput, setNewDateInput] = useState('2024-12-06');

  useEffect(() => {
    async function loadStartDate() {
      try {
        const stored = await AsyncStorage.getItem('@relationship_start_date');
        if (stored) {
          setStartDateStr(stored);
          setNewDateInput(stored);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadStartDate();
  }, []);

  useEffect(() => {
    const statsObj = getRelationshipStats(new Date(startDateStr + 'T00:00:00'));
    setStats(statsObj);
  }, [startDateStr]);

  const days = useCountUp(stats.days);
  
  const [topMemory, setTopMemory] = useState<any>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check Supabase configurations
  useEffect(() => {
    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
    setIsConfigured(!!(isUrlConfigured && isKeyConfigured));
  }, []);

  const loadHomeData = async () => {
    setLoading(true);

    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');

    if (!isUrlConfigured || !isKeyConfigured) {
      // Fallback local mocks
      setTopMemory({
        id: 'm1', cat: 'restaurant', tag: '5 estrelas', title: 'Maní', date: '01 Jun', by: 'Leonardo',
        loc: 'Jardins, São Paulo',
        desc: 'Menu degustação incrível. O risoto de beterraba foi o prato da noite.',
        stars: 5, fav: true,
        reactions: [{ e: '❤️', n: 1, mine: true }, { e: '😍', n: 1, mine: false }],
        spotify: { track: 'La Vie en Rose', artist: 'Édith Piaf' },
        comments: [1, 2],
      });
      setLastMessage({
        name: 'Leonardo',
        text: 'Já pensei onde vamos jantar no aniversário. Fica na espera pra descobrir onde!',
        time: '10:47',
      });
      setLoading(false);
      return;
    }

    try {
      // 1. Get top memory
      const { data: mems } = await supabase
        .from('memories')
        .select(`
          *,
          author:users(display_name),
          comments:memory_comments(id),
          reactions:memory_reactions(emoji, user_id),
          favorites:favorites(user_id),
          spotify:memory_spotify(*)
        `)
        .order('created_at', { ascending: false })
        .limit(1);

      if (mems && mems.length > 0) {
        const m = mems[0];
        const dateObj = new Date(m.created_at);
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        
        const isFav = (m.favorites || []).some((f: any) => f.user_id === user?.id);
        const rawReactions = m.reactions || [];
        const reactionCounts = rawReactions.reduce((acc: any, r: any) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
          return acc;
        }, {});
        const reactionsList = Object.keys(reactionCounts).map(emoji => ({
          e: emoji,
          n: reactionCounts[emoji],
          mine: rawReactions.some((r: any) => r.emoji === emoji && r.user_id === user?.id),
        }));

        const spotifyInfo = m.spotify && m.spotify.length > 0 ? {
          track: m.spotify[0].track_name,
          artist: m.spotify[0].artist,
        } : null;

        setTopMemory({
          id: m.id,
          cat: m.type,
          title: m.title,
          date: formattedDate,
          by: m.author?.display_name || 'Parceiro',
          loc: m.location,
          desc: m.description || '',
          stars: m.rating || 0,
          fav: isFav,
          photoUrl: m.photo_url,
          reactions: reactionsList,
          comments: m.comments || [],
          spotify: spotifyInfo,
        });
      } else {
        setTopMemory(null);
      }

      // 2. Get last message
      const { data: msgs } = await supabase
        .from('messages')
        .select(`
          *,
          author:users(display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(1);

      if (msgs && msgs.length > 0) {
        const msg = msgs[0];
        const dateObj = new Date(msg.created_at);
        setLastMessage({
          name: msg.author?.display_name || 'Parceiro',
          text: msg.content,
          time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        setLastMessage(null);
      }
    } catch (e) {
      console.error('Failed to load home details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [user]);

  // Determine current user display
  const currentUserName = user?.displayName || COUPLE.name;
  const isEla = user?.username === 'ela';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Dark header */}
      <View style={styles.darkHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{COUPLE.greeting}</Text>
            <Text style={styles.name}>{currentUserName} <Text style={{ opacity: 0.7 }}>♡</Text></Text>
          </View>
          <View style={styles.avatarPair}>
            <View style={[styles.avatar, styles.avatarA, isEla && styles.activeAvatar]}>
              <Text style={styles.avatarText}>{COUPLE.a}</Text>
            </View>
            <View style={[styles.avatar, styles.avatarB, !isEla && styles.activeAvatar]}>
              <Text style={styles.avatarText}>{COUPLE.b}</Text>
            </View>
          </View>
        </View>

        {/* Counter card */}
        <View style={styles.counterCard}>
          <Text style={styles.counterHeart}>♥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.counterNumber}>{days.toLocaleString('pt-BR')}</Text>
            <Text style={styles.counterLabel}>dias juntos</Text>
          </View>
          <View style={styles.counterNext}>
            <Text style={styles.nextLabel}>próximo</Text>
            <Text style={styles.nextValue}>Aniversário · {stats.nextIn} dias</Text>
          </View>
          <TouchableOpacity 
            style={{ padding: 6, marginLeft: 8 }} 
            onPress={() => setIsEditingDate(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: COLORS.headerAccent }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown */}
        <View style={styles.counterBreak}>
          <Text style={styles.breakItem}><Text style={styles.breakNum}>{stats.years}</Text> anos</Text>
          <Text style={styles.breakDot}>·</Text>
          <Text style={styles.breakItem}><Text style={styles.breakNum}>{stats.months}</Text> meses</Text>
          <Text style={styles.breakDot}>·</Text>
          <Text style={styles.breakItem}><Text style={styles.breakNum}>{stats.restDays}</Text> dias</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick access grid */}
        <Text style={styles.secLabel}>acesso rápido</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '📸', label: 'Memórias', route: '/feed' },
            { icon: '📅', label: 'Planos', route: '/plan' },
            { icon: '💬', label: 'Recados', route: '/notes' },
            { icon: '✨', label: 'Mais', route: '/more' },
          ].map((btn, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.quickBtn} 
              activeOpacity={0.7}
              onPress={() => router.push(btn.route as any)}
            >
              <Text style={{ fontSize: 23 }}>{btn.icon}</Text>
              <Text style={styles.quickLabel}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dice banner */}
        <TouchableOpacity 
          style={styles.diceBanner} 
          activeOpacity={0.8}
          onPress={() => router.push('/activities')}
        >
          <Text style={{ fontSize: 26 }}>🎲</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.diceTitle}>O que fazemos agora?</Text>
            <Text style={styles.diceSub}>Sorteie uma atividade pra dois</Text>
          </View>
          <Text style={{ color: '#fff', opacity: 0.6, fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {/* Dynamic Notification Card */}
        <Text style={styles.secLabel}>para vocês</Text>
        <TouchableOpacity 
          style={styles.notifCard} 
          activeOpacity={0.7}
          onPress={() => router.push('/timeline')}
        >
          <View style={[styles.notifIcon, { backgroundColor: COLORS.accentSoft }]}>
            <Text style={{ fontSize: 18 }}>💕</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>Faltam {stats.nextIn} dias</Text>
            <Text style={styles.notifText}>Para o próximo aniversário de namoro de vocês! 👩‍❤️‍👨</Text>
          </View>
        </TouchableOpacity>

        {/* Last message preview */}
        <Text style={styles.secLabel}>último recado</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingVertical: 12 }} />
        ) : lastMessage ? (
          <TouchableOpacity 
            style={styles.msgCard} 
            activeOpacity={0.7}
            onPress={() => router.push('/notes')}
          >
            <View style={styles.msgDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.msgSender}>{lastMessage.name}</Text>
              <Text style={styles.msgText}>{lastMessage.text}</Text>
            </View>
            <Text style={styles.msgTime}>{lastMessage.time}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhum recado cadastrado. Deixe uma nota para o seu amor! ✍️</Text>
          </View>
        )}

        {/* Recent feed */}
        <Text style={styles.secLabel}>memória mais recente</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingVertical: 20 }} />
        ) : topMemory ? (
          (() => {
            const topType = MTYPE[topMemory.cat] || MTYPE.other;
            return (
              <TouchableOpacity 
                style={styles.feedCard} 
                activeOpacity={0.8}
                onPress={() => router.push('/feed')}
              >
                {topMemory.photoUrl ? (
                  <Image source={{ uri: topMemory.photoUrl }} style={styles.topMemoryPhoto} />
                ) : (
                  <View style={[styles.feedPhoto, { backgroundColor: topType.tint }]}>
                    <Text style={{ fontSize: 42, opacity: 0.5 }}>🍽️</Text>
                    <View style={styles.feedIconBadge}>
                      <Text style={{ fontSize: 14 }}>
                        {topMemory.cat === 'restaurant' ? '🍽️' : topMemory.cat === 'movie' ? '🎬' : topMemory.cat === 'place' ? '🏖️' : '✨'}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.feedBody}>
                  <View style={styles.feedMeta}>
                    <Text style={styles.feedType}>{topType.label}</Text>
                    <Text style={styles.feedDate}>{topMemory.date}</Text>
                    <View style={[styles.feedTag, { backgroundColor: topType.tint }]}>
                      <Text style={[styles.feedTagText, { color: topType.color }]}>{topMemory.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.feedTitle}>{topMemory.title}</Text>
                  {topMemory.loc && (
                    <Text style={styles.feedLoc}>📍 {topMemory.loc} · {topMemory.by}</Text>
                  )}
                  <Text style={styles.feedDesc} numberOfLines={3}>{topMemory.desc}</Text>
                  
                  {topMemory.spotify && (
                    <View style={styles.spotifyMini}>
                      <Text style={{ fontSize: 17, color: '#1DB954' }}>♫</Text>
                      <Text style={styles.spotifyText}>
                        <Text style={{ fontWeight: '600', color: '#3a4a3c' }}>{topMemory.spotify.track}</Text>
                        {' · '}{topMemory.spotify.artist}
                      </Text>
                    </View>
                  )}
                  <View style={styles.feedFoot}>
                    <View style={styles.reactRow}>
                      {topMemory.reactions.slice(0, 3).map((r: any, i: number) => (
                        <View key={i} style={[styles.reactPill, r.mine && styles.reactPillMine]}>
                          <Text style={{ fontSize: 13 }}>{r.e}</Text>
                          <Text style={[styles.reactCount, r.mine && { color: COLORS.accentDeep }]}>{r.n}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.commentBtn}>
                      <Text style={{ fontSize: 15, color: COLORS.muted }}>💬</Text>
                      <Text style={{ fontSize: 12, color: COLORS.muted }}>{topMemory.comments.length}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhuma memória cadastrada. Registre a sua primeira memória no feed! 📸</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Start Date Modal */}
      {isEditingDate && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Alterar Data de Namoro</Text>
            
            <Text style={styles.label}>Nova Data (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 2024-12-06"
              value={newDateInput}
              onChangeText={setNewDateInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsEditingDate(false);
                  setNewDateInput(startDateStr);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={async () => {
                  const regex = /^\d{4}-\d{2}-\d{2}$/;
                  if (!regex.test(newDateInput)) {
                    Alert.alert('Erro', 'Por favor, insira a data no formato AAAA-MM-DD (ex: 2024-12-06)');
                    return;
                  }
                  try {
                    await AsyncStorage.setItem('@relationship_start_date', newDateInput);
                    setStartDateStr(newDateInput);
                    setIsEditingDate(false);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Salvar</Text>
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
  darkHeader: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
    marginBottom: 5,
  },
  name: {
    fontSize: 27,
    color: COLORS.headerText,
    fontStyle: 'italic',
  },
  avatarPair: { flexDirection: 'row', marginTop: 2 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: COLORS.headerBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarA: { backgroundColor: '#e6b3c5', marginRight: -10, zIndex: 2 },
  avatarB: { backgroundColor: '#b3c7dd' },
  avatarText: { fontSize: 12, fontWeight: '600' },
  activeAvatar: { borderColor: COLORS.headerAccent, borderWidth: 2 },

  counterCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  counterHeart: { fontSize: 22, color: COLORS.headerAccent },
  counterNumber: {
    fontSize: 32,
    color: COLORS.headerText,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
    marginTop: 2,
  },
  counterNext: { marginLeft: 'auto', alignItems: 'flex-end' },
  nextLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.headerSub,
  },
  nextValue: {
    fontSize: 13,
    color: COLORS.headerAccent,
    fontWeight: '500',
    marginTop: 3,
  },

  counterBreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  breakItem: { fontSize: 11, color: COLORS.headerSub, letterSpacing: 0.4 },
  breakNum: { fontSize: 17, color: COLORS.headerText, fontWeight: '500', marginRight: 3 },
  breakDot: { fontSize: 11, color: COLORS.headerSub, opacity: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 18, paddingBottom: 30 },

  secLabel: {
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#b59aa1',
    marginBottom: -6,
  },

  quickGrid: { flexDirection: 'row', gap: 9 },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    paddingHorizontal: 5,
    alignItems: 'center',
    gap: 7,
  },
  quickLabel: { fontSize: 10, color: COLORS.muted, textAlign: 'center', letterSpacing: 0.2 },

  diceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  diceTitle: {
    fontStyle: 'italic',
    fontSize: 18,
    color: '#fff',
  },
  diceSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 3 },

  notifCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
  },
  notifIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  notifText: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },

  msgCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
  },
  msgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 5 },
  msgSender: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  msgText: { fontSize: 13.5, color: COLORS.text, lineHeight: 19 },
  msgTime: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  feedCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  topMemoryPhoto: {
    height: 180,
    width: '100%',
    resizeMode: 'cover',
  },
  feedPhoto: {
    height: 158,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  feedIconBadge: {
    position: 'absolute',
    top: 11, left: 11,
    width: 30, height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center', justifyContent: 'center',
  },
  feedBody: { padding: 13, paddingBottom: 15 },
  feedMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  feedType: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.muted },
  feedDate: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },
  feedTag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 11 },
  feedTagText: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '500' },
  feedTitle: { fontSize: 20, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  feedLoc: { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  feedDesc: { fontSize: 12.5, color: '#8a7178', lineHeight: 19, marginBottom: 12 },
  feedFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reactRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  reactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 4, paddingHorizontal: 9,
  },
  reactPillMine: {
    backgroundColor: COLORS.accentSoft,
    borderColor: 'rgba(200,90,124,0.4)',
  },
  reactCount: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  spotifyMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f2f7f2',
    borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 10,
    marginBottom: 11,
  },
  spotifyText: { fontSize: 11, color: '#5a6b5c' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 20, backgroundColor: COLORS.bg, width: '100%' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
