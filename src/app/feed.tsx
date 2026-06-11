import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Platform, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS, MTYPE, REACTION_SET } from '@/constants/theme';
import { FEED as MOCK_FEED } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import MusicSearch from '@/components/MusicSearch';
import LocationSearch from '@/components/LocationSearch';

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'fav', label: '★ Favoritas' },
  { key: 'restaurant', label: 'Restaurantes' },
  { key: 'place', label: 'Lugares' },
  { key: 'movie', label: 'Filmes' },
  { key: 'special', label: 'Especiais' },
];

interface Memory {
  id: string | number;
  cat: string;
  tag: string;
  title: string;
  date: string;
  by: string;
  loc: string | null;
  desc: string;
  stars: number;
  fav: boolean;
  photoUrl?: string | null;
  reactions: Array<{ e: string; n: number; mine: boolean }>;
  spotify: { track: string; artist: string } | null;
  comments: Array<{ who: string; text: string }>;
  created_at?: string;
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('restaurant');
  const [formDesc, setFormDesc] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [formRating, setFormRating] = useState(5);
  const [formSpotifyTrack, setFormSpotifyTrack] = useState('');
  const [formSpotifyArtist, setFormSpotifyArtist] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);

  // Comments state
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [commentText, setCommentText] = useState('');

  // Check Supabase configurations
  useEffect(() => {
    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
    console.log('Feed Screen Supabase check:', {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      isUrlConfigured,
      isKeyConfigured,
    });
    setIsConfigured(!!(isUrlConfigured && isKeyConfigured));
  }, []);

  // Fetch memories load
  const loadMemories = async () => {
    setLoading(true);
    
    // Check if configuration exists
    const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
    
    if (!isUrlConfigured || !isKeyConfigured) {
      // Fallback to Mock Data
      setMemories(MOCK_FEED.map(m => ({
        ...m,
        photoUrl: null, // use dummy icons in list
      })));
      setLoading(false);
      return;
    }

    try {
      // Fetch memories with joins
      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          author:users(display_name),
          comments:memory_comments(id, content, author:users(display_name)),
          reactions:memory_reactions(emoji, user_id),
          favorites:favorites(user_id),
          spotify:memory_spotify(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: Memory[] = data.map(m => {
          // Format created_at to "01 Jun" style
          const dateObj = new Date(m.created_at);
          const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

          // Map reactions
          const rawReactions = m.reactions || [];
          const reactionCounts = rawReactions.reduce((acc: any, r: any) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {});

          const reactionsList = Object.keys(reactionCounts).map(emoji => {
            const hasMine = rawReactions.some((r: any) => r.emoji === emoji && r.user_id === user?.id);
            return {
              e: emoji,
              n: reactionCounts[emoji],
              mine: hasMine,
            };
          });

          // Fallback to default set if empty
          const finalReactions = reactionsList.length > 0 ? reactionsList : [];

          // Map favorites
          const isFav = (m.favorites || []).some((f: any) => f.user_id === user?.id);

          // Map comments
          const commentsList = (m.comments || []).map((c: any) => ({
            who: c.author?.display_name || 'Alguém',
            text: c.content,
          }));

          // Map Spotify
          const spotifyInfo = m.spotify && m.spotify.length > 0 ? {
            track: m.spotify[0].track_name,
            artist: m.spotify[0].artist,
          } : null;

          return {
            id: m.id,
            cat: m.type,
            tag: m.type === 'movie' ? 'assistido' : m.rating === 5 ? '5 estrelas' : m.location ? 'viagem' : 'momento',
            title: m.title,
            date: formattedDate,
            by: m.author?.display_name || 'Parceiro',
            loc: m.location,
            desc: m.description || '',
            stars: m.rating || 0,
            fav: isFav,
            photoUrl: m.photo_url,
            reactions: finalReactions,
            spotify: spotifyInfo,
            comments: commentsList,
            created_at: m.created_at,
          };
        });
        setMemories(mapped);
      }
    } catch (err) {
      console.error('Failed to load memories from Supabase:', err);
      // Fallback silently to mock
      setMemories(MOCK_FEED as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [user]);

  // Handle reactions
  const handleReact = async (memoryId: string | number, emoji: string) => {
    if (!user || !isConfigured) {
      // Local fallback interaction
      setMemories(prev => prev.map(m => {
        if (m.id !== memoryId) return m;
        const index = m.reactions.findIndex(r => r.e === emoji);
        let updatedReactions = [...m.reactions];
        if (index > -1) {
          const r = updatedReactions[index];
          if (r.mine) {
            if (r.n <= 1) {
              updatedReactions.splice(index, 1);
            } else {
              updatedReactions[index] = { ...r, n: r.n - 1, mine: false };
            }
          } else {
            updatedReactions[index] = { ...r, n: r.n + 1, mine: true };
          }
        } else {
          updatedReactions.push({ e: emoji, n: 1, mine: true });
        }
        return { ...m, reactions: updatedReactions };
      }));
      return;
    }

    try {
      // Check if reaction exists
      const { data, error } = await supabase
        .from('memory_reactions')
        .select('*')
        .eq('memory_id', memoryId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (data && data.length > 0) {
        // Delete reaction
        await supabase
          .from('memory_reactions')
          .delete()
          .eq('id', data[0].id);
      } else {
        // Insert reaction
        await supabase
          .from('memory_reactions')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
            emoji: emoji,
          });
        const memoryTitle = memories.find(m => m.id === memoryId)?.title || 'uma lembrança';
        await sendNotification(
          user.id,
          'new_comment',
          `${user.displayName} reagiu com ${emoji}!`,
          `Em "${memoryTitle}"`
        );
      }
      loadMemories();
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // Toggle favorite
  const handleToggleFav = async (memoryId: string | number, currentFav: boolean) => {
    if (!user || !isConfigured) {
      // Mock toggle
      setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, fav: !m.fav } : m));
      return;
    }

    try {
      if (currentFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('favorites')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
          });
      }
      loadMemories();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // File Picker simulation for Web and Native
  const handlePickFile = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setPickedFile(file);
      // Create local preview URL
      const localUrl = URL.createObjectURL(file);
      setFormPhotoUrl(localUrl);
    }
  };

  // Upload file to storage
  const uploadPhoto = async (file: any): Promise<{ url: string | null; key: string | null }> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = `memories/${fileName}`;

      const { data, error } = await supabase.storage
        .from('memories')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('memories')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        key: filePath,
      };
    } catch (err) {
      console.error('Failed to upload photo:', err);
      return { url: null, key: null };
    }
  };

  const [editingMemoryId, setEditingMemoryId] = useState<string | number | null>(null);
  const [searchText, setSearchText] = useState('');

  const startEditMemory = (m: Memory) => {
    setEditingMemoryId(m.id);
    setFormTitle(m.title);
    setFormType(m.cat);
    setFormDesc(m.desc);
    setFormLoc(m.loc || '');
    setFormLat(null);
    setFormLng(null);
    setFormRating(m.stars);
    setFormSpotifyTrack(m.spotify?.track || '');
    setFormSpotifyArtist(m.spotify?.artist || '');
    setFormPhotoUrl(m.photoUrl || '');
    setIsAdding(true);
  };

  const handleDeleteMemory = async (memoryId: string | number) => {
    Alert.alert(
      'Deletar Memória',
      'Tem certeza que deseja apagar esta memória? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            if (!isConfigured) {
              setMemories(prev => prev.filter(m => m.id !== memoryId));
              return;
            }
            try {
              const { error } = await supabase
                .from('memories')
                .delete()
                .eq('id', memoryId);

              if (error) throw error;
              loadMemories();
            } catch (err) {
              console.error('Failed to delete memory:', err);
            }
          }
        }
      ]
    );
  };

  // Create or update memory
  const handleCreateMemory = async () => {
    if (!formTitle.trim() || !user) return;

    setLoading(true);
    let finalUrl = formPhotoUrl || null;
    let finalKey = null;

    if (pickedFile && isConfigured) {
      setUploadingImage(true);
      const uploadRes = await uploadPhoto(pickedFile);
      finalUrl = uploadRes.url;
      finalKey = uploadRes.key;
      setUploadingImage(false);
    }

    if (!isConfigured) {
      if (editingMemoryId) {
        setMemories(prev => prev.map(m => m.id === editingMemoryId ? {
          ...m,
          cat: formType,
          title: formTitle,
          loc: formLoc.trim() || null,
          desc: formDesc,
          stars: (formType === 'restaurant' || formType === 'movie') ? formRating : 0,
          spotify: (formSpotifyTrack.trim() && formSpotifyArtist.trim()) ? {
            track: formSpotifyTrack,
            artist: formSpotifyArtist,
          } : null,
        } : m));
      } else {
        const mockNew: Memory = {
          id: `m_${Date.now()}`,
          cat: formType,
          tag: 'novo',
          title: formTitle,
          date: 'Hoje',
          by: user.displayName,
          loc: formLoc.trim() || null,
          desc: formDesc,
          stars: (formType === 'restaurant' || formType === 'movie') ? formRating : 0,
          fav: false,
          photoUrl: null,
          reactions: [],
          spotify: (formSpotifyTrack.trim() && formSpotifyArtist.trim()) ? {
            track: formSpotifyTrack,
            artist: formSpotifyArtist,
          } : null,
          comments: [],
        };
        setMemories([mockNew, ...memories]);
      }
      setIsAdding(false);
      resetForm();
      setLoading(false);
      return;
    }

    try {
      if (editingMemoryId) {
        // Update memory
        const { error } = await supabase
          .from('memories')
          .update({
            type: formType,
            title: formTitle,
            description: formDesc || null,
            location: formLoc || null,
            latitude: formLat,
            longitude: formLng,
            rating: (formType === 'restaurant' || formType === 'movie') ? formRating : null,
            photo_url: finalUrl,
            photo_key: finalKey,
          })
          .eq('id', editingMemoryId);

        if (error) throw error;

        // Reset and insert Spotify if filled
        await supabase.from('memory_spotify').delete().eq('memory_id', editingMemoryId);
        if (formSpotifyTrack.trim() && formSpotifyArtist.trim()) {
          await supabase
            .from('memory_spotify')
            .insert({
              memory_id: editingMemoryId,
              track_name: formSpotifyTrack,
              artist: formSpotifyArtist,
            });
        }
      } else {
        // Insert memory
        const { data, error } = await supabase
          .from('memories')
          .insert({
            type: formType,
            title: formTitle,
            description: formDesc || null,
            location: formLoc || null,
            latitude: formLat,
            longitude: formLng,
            rating: (formType === 'restaurant' || formType === 'movie') ? formRating : null,
            photo_url: finalUrl,
            photo_key: finalKey,
            created_by: user.id,
          })
          .select();

        if (error) throw error;

        // Trigger notification
        await sendNotification(
          user.id,
          'new_memory',
          `${user.displayName} registrou uma nova lembrança! 📸`,
          `Criou "${formTitle}" em ${formLoc || 'nosso espaço'}.`
        );

        // Insert Spotify if filled
        if (data && data.length > 0 && formSpotifyTrack.trim() && formSpotifyArtist.trim()) {
          await supabase
            .from('memory_spotify')
            .insert({
              memory_id: data[0].id,
              track_name: formSpotifyTrack,
              artist: formSpotifyArtist,
            });
        }
      }

      await loadMemories();
      setIsAdding(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save memory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedMemory || !user) return;

    if (!isConfigured) {
      // Mock insert
      const updated = {
        ...selectedMemory,
        comments: [...selectedMemory.comments, { who: user.displayName, text: commentText }],
      };
      setMemories(prev => prev.map(m => m.id === selectedMemory.id ? updated : m));
      setSelectedMemory(updated);
      setCommentText('');
      return;
    }

    try {
      const { error } = await supabase
        .from('memory_comments')
        .insert({
          memory_id: selectedMemory.id,
          author_id: user.id,
          content: commentText,
        });

      if (error) throw error;

      await sendNotification(
        user.id,
        'new_comment',
        `${user.displayName} comentou em uma memória! 💬`,
        `Comentou em "${selectedMemory.title}": "${commentText}"`
      );

      setCommentText('');
      // Reload specific comments
      const { data } = await supabase
        .from('memory_comments')
        .select(`
          id,
          content,
          author:users(display_name)
        `)
        .eq('memory_id', selectedMemory.id);

      if (data) {
        const updatedComments = data.map((c: any) => ({
          who: c.author?.display_name || 'Parceiro',
          text: c.content,
        }));
        const updated = { ...selectedMemory, comments: updatedComments };
        setSelectedMemory(updated);
        setMemories(prev => prev.map(m => m.id === selectedMemory.id ? updated : m));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormType('restaurant');
    setFormDesc('');
    setFormLoc('');
    setFormLat(null);
    setFormLng(null);
    setFormRating(5);
    setFormSpotifyTrack('');
    setFormSpotifyArtist('');
    setFormPhotoUrl('');
    setPickedFile(null);
    setEditingMemoryId(null);
  };

  const openSpotifySearch = (track: string, artist: string) => {
    const query = encodeURIComponent(`${track} ${artist}`);
    // Try Spotify first, fallback to YouTube Music
    const spotifyUrl = `https://open.spotify.com/search/${query}`;
    Linking.openURL(spotifyUrl).catch(() => {
      const ytUrl = `https://music.youtube.com/search?q=${query}`;
      Linking.openURL(ytUrl).catch(() => {
        Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(`${track} ${artist} music`)}`);
      });
    });
  };

  // Filter list
  const list = (filter === 'all' ? memories
    : filter === 'fav' ? memories.filter(m => m.fav)
    : memories.filter(m => m.cat === filter)
  ).filter(m => {
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase();
    return (
      m.title.toLowerCase().includes(query) ||
      (m.loc && m.loc.toLowerCase().includes(query)) ||
      m.desc.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nossas memórias</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Warning local mode banner if not configured */}
      {!isConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipOn]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por título, local ou relato..."
          placeholderTextColor="#a69098"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && memories.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando memórias...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {list.map(m => {
            const t = MTYPE[m.cat] || MTYPE.other;
            return (
              <TouchableOpacity 
                key={m.id} 
                style={styles.card} 
                activeOpacity={0.9}
                onPress={() => setSelectedMemory(m)}
              >
                {m.photoUrl ? (
                  <Image source={{ uri: m.photoUrl }} style={styles.photoImage} />
                ) : (
                  <View style={[styles.photo, { backgroundColor: t.tint }]}>
                    <Text style={{ fontSize: 42, opacity: 0.5 }}>
                      {m.cat === 'restaurant' ? '🍽️' : m.cat === 'movie' ? '🎬' : m.cat === 'place' ? '🏖️' : '✨'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.favBtn, m.fav && styles.favBtnOn]}
                  onPress={() => handleToggleFav(m.id, m.fav)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: m.fav ? COLORS.accent : COLORS.muted, fontSize: 14 }}>
                    {m.fav ? '♥' : '♡'}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const isCreator = m.by === user?.displayName;
                  return (
                    <>
                      {isCreator && (
                        <TouchableOpacity 
                          style={styles.editBtn}
                          onPress={() => startEditMemory(m)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 13 }}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.delBtn, !isCreator && { right: 48 }]}
                        onPress={() => handleDeleteMemory(m.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13 }}>🗑️</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

                {m.stars > 0 && (
                  <View style={styles.ratingBadge}>
                    {Array.from({ length: m.stars }).map((_, i) => (
                      <Text key={i} style={{ fontSize: 11, color: '#ffd479' }}>★</Text>
                    ))}
                  </View>
                )}

                <View style={styles.body}>
                  <View style={styles.meta}>
                    <Text style={styles.type}>{t.label}</Text>
                    <Text style={styles.date}>{m.date}</Text>
                    <View style={[styles.tag, { backgroundColor: t.tint }]}>
                      <Text style={[styles.tagText, { color: t.color }]}>{m.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.title}>{m.title}</Text>
                  {m.loc && <Text style={styles.loc}>📍 {m.loc} · {m.by}</Text>}
                  <Text style={styles.desc}>{m.desc}</Text>
                  
                  {m.spotify && (
                    <TouchableOpacity 
                      style={styles.spotify}
                      onPress={() => openSpotifySearch(m.spotify!.track, m.spotify!.artist)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15, color: '#1DB954' }}>♫</Text>
                      <Text style={styles.spotifyText}>
                        <Text style={{ fontWeight: '600', color: '#3a4a3c' }}>{m.spotify.track}</Text>
                        {' · '}{m.spotify.artist}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#1DB954', marginLeft: 'auto' }}>▶ Ouvir</Text>
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.foot}>
                    <View style={styles.reactions}>
                      {REACTION_SET.slice(0, 4).map(emoji => {
                        const react = m.reactions.find(r => r.e === emoji);
                        return (
                          <TouchableOpacity 
                            key={emoji} 
                            style={[styles.pill, react?.mine && styles.pillMine]}
                            onPress={() => handleReact(m.id, emoji)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12 }}>{emoji}</Text>
                            <Text style={[styles.pillCount, react?.mine && { color: COLORS.accentDeep }]}>
                              {react ? react.n : 0}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.cmtBtn}>
                      <Text style={{ fontSize: 14, color: COLORS.muted }}>💬</Text>
                      <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: '600' }}>
                        {m.comments.length}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {list.length === 0 && <Text style={styles.empty}>Nenhuma memória cadastrada nesta categoria.</Text>}
        </ScrollView>
      )}

      {/* Add Memory Modal Overlay */}
      {isAdding && (
        <View style={styles.overlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Adicionar Memória</Text>

              {/* Title */}
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Piquenique no Ibirapuera"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Type Grid */}
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.typeGrid}>
                {Object.keys(MTYPE).slice(0, 5).map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeButton, formType === key && styles.typeButtonSelected]}
                    onPress={() => setFormType(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeButtonIcon}>
                      {key === 'restaurant' ? '🍽️' : key === 'movie' ? '🎬' : key === 'place' ? '🏖️' : key === 'special' ? '💖' : '🛍️'}
                    </Text>
                    <Text style={[styles.typeButtonText, formType === key && styles.typeButtonTextSelected]}>
                      {MTYPE[key].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating (only for restaurant or movie) */}
              {(formType === 'restaurant' || formType === 'movie') && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Avaliação (1-5 estrelas)</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setFormRating(star)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 28, color: star <= formRating ? '#ffd479' : COLORS.border }}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Description */}
              <Text style={styles.label}>Descrição / Relato</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="O que acharam? O que comeram? Como foi?"
                multiline
                numberOfLines={3}
                value={formDesc}
                onChangeText={setFormDesc}
              />

              {/* Location Search */}
              <Text style={styles.label}>Localização</Text>
              <LocationSearch
                locationText={formLoc}
                onSelect={(location, lat, lng) => {
                  setFormLoc(location);
                  setFormLat(lat);
                  setFormLng(lng);
                }}
              />

              {/* Music Search */}
              <Text style={styles.label}>Trilha Sonora 🎵</Text>
              <MusicSearch
                trackName={formSpotifyTrack}
                artistName={formSpotifyArtist}
                onSelect={(track, artist) => {
                  setFormSpotifyTrack(track);
                  setFormSpotifyArtist(artist);
                }}
              />

              {/* Photo Upload Input (Web-compatible file picker) */}
              <Text style={styles.label}>Foto</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.filePickerContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePickFile}
                    style={webStyles.fileInputWeb}
                    id="file-upload-input"
                  />
                  <label htmlFor="file-upload-input" style={webStyles.fileUploadLabel}>
                    📸 Escolher Foto
                  </label>
                  {formPhotoUrl ? (
                    <Image source={{ uri: formPhotoUrl }} style={styles.uploadPreview} />
                  ) : null}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Link da imagem (URL)"
                  value={formPhotoUrl}
                  onChangeText={setFormPhotoUrl}
                />
              )}

              {/* Actions */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]} 
                  onPress={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn, (!formTitle.trim() || uploadingImage) && styles.saveBtnDisabled]} 
                  onPress={handleCreateMemory}
                  disabled={!formTitle.trim() || uploadingImage}
                  activeOpacity={0.7}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Memory Details / Comments Modal */}
      {selectedMemory && (
        <View style={styles.overlay}>
          <View style={styles.commentModal}>
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalTitle} numberOfLines={1}>{selectedMemory.title}</Text>
              <TouchableOpacity onPress={() => setSelectedMemory(null)} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 16, color: COLORS.muted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.commentModalSub}>Comentários da Memória ({selectedMemory.comments.length})</Text>

            <ScrollView style={styles.commentsScroll} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
              {selectedMemory.comments.map((c, i) => (
                <View key={i} style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>{c.who}</Text>
                  <Text style={styles.commentContent}>{c.text}</Text>
                </View>
              ))}
              {selectedMemory.comments.length === 0 && (
                <Text style={styles.noCommentsText}>Deixe o primeiro comentário sobre esse momento! 💕</Text>
              )}
            </ScrollView>

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escreva um comentário..."
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity 
                style={[styles.sendCommentBtn, !commentText.trim() && { opacity: 0.6 }]} 
                onPress={handleAddComment}
                disabled={!commentText.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.sendCommentText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const webStyles = {
  fileInputWeb: {
    display: 'none',
  } as any,
  fileUploadLabel: {
    display: 'inline-block',
    backgroundColor: COLORS.bg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    padding: 12,
    borderRadius: RADIUS.sm,
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    width: '100%',
  } as any,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },

  warningBanner: {
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(199, 154, 58, 0.2)',
  },
  warningText: {
    fontSize: 10.5,
    color: COLORS.gold,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },

  filterRowContainer: {
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  filterRow: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 13, gap: 8 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipOn: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12, color: COLORS.muted },
  filterTextOn: { color: COLORS.headerAccent },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 30 },

  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  photo: { height: 158, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  photoImage: { height: 180, width: '100%', resizeMode: 'cover' },
  favBtn: { position: 'absolute', top: 11, right: 11, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  favBtnOn: {},
  editBtn: { position: 'absolute', top: 11, right: 48, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  delBtn: { position: 'absolute', top: 11, right: 85, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.bg },
  searchInput: { height: 38, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, paddingHorizontal: 16, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surface },
  ratingBadge: { position: 'absolute', bottom: 11, left: 11, flexDirection: 'row', gap: 2, backgroundColor: 'rgba(20,10,15,0.42)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  body: { padding: 13, paddingBottom: 15 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  type: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.muted },
  date: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },
  tag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 11 },
  tagText: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '500' },
  title: { fontSize: 20, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  loc: { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  desc: { fontSize: 12.5, color: '#8a7178', lineHeight: 19, marginBottom: 12 },
  foot: { flexDirection: 'row', alignItems: 'center' },
  reactions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9 },
  pillMine: { backgroundColor: COLORS.accentSoft, borderColor: 'rgba(200,90,124,0.4)' },
  pillCount: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  cmtBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spotify: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f7f2', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 11 },
  spotifyText: { fontSize: 11, color: '#5a6b5c' },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 13 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },

  /* Modal Form Styles */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, zIndex: 99 },
  modalScroll: { width: '100%', maxWidth: 420, marginVertical: 30 },
  modalScrollContent: { justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, alignSelf: 'flex-start' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 16, backgroundColor: COLORS.bg, width: '100%' },
  row: { flexDirection: 'row', width: '100%' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, width: '100%' },
  typeButton: { flex: 1, minWidth: '28%', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonIcon: { fontSize: 18 },
  typeButtonText: { fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  
  filePickerContainer: { width: '100%', marginBottom: 16, alignItems: 'center' },
  uploadPreview: { width: 100, height: 100, borderRadius: RADIUS.sm, marginTop: 10, resizeMode: 'cover' },

  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveBtnDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },

  /* Comments Modal Styles */
  commentModal: { width: '100%', maxWidth: 380, height: 420, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  commentModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingBottom: 10, marginBottom: 12 },
  commentModalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, flex: 1 },
  closeBtn: { padding: 4 },
  commentModalSub: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 10 },
  commentsScroll: { flex: 1, marginBottom: 12 },
  commentBubble: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10 },
  commentAuthor: { fontSize: 11.5, fontWeight: '600', color: COLORS.accentDeep, marginBottom: 2 },
  commentContent: { fontSize: 12.5, color: COLORS.text, lineHeight: 17 },
  noCommentsText: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 12.5, fontStyle: 'italic' },
  commentInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  commentInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.bg },
  sendCommentBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  sendCommentText: { fontSize: 12.5, fontWeight: '600', color: '#ffffff' },
});
