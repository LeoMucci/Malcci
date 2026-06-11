import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useAuth();
  const [loadingUser, setLoadingUser] = useState<'eu' | 'ela' | null>(null);

  const handleLogin = async (username: 'eu' | 'ela') => {
    setLoadingUser(username);
    // Add a slight delay for romantic aesthetic effect (smooth transition)
    setTimeout(async () => {
      await login(username);
      setLoadingUser(null);
    }, 600);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Premium dark gradient background matching the app's romantic palette */}
      <LinearGradient
        colors={[COLORS.headerBg, '#4a2635', '#2a1a22']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating background elements for premium feel */}
      <View style={[styles.glowCircle, { top: '15%', left: '10%', backgroundColor: 'rgba(200, 90, 124, 0.15)' }]} />
      <View style={[styles.glowCircle, { bottom: '20%', right: '10%', backgroundColor: 'rgba(199, 154, 58, 0.1)' }]} />

      <View style={styles.content}>
        {/* Heart logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoHeart}>♥</Text>
          <View style={styles.logoRing} />
        </View>

        {/* Header */}
        <Text style={styles.title}>Malcci 💕</Text>
        <Text style={styles.subtitle}>Escolha quem está entrando hoje</Text>

        {/* User Selection Buttons */}
        <View style={styles.buttonContainer}>
          {/* Luysa (Ela) */}
          <TouchableOpacity
            style={[
              styles.userCard,
              styles.userCardLuysa,
              loadingUser === 'ela' && styles.userCardSelected,
            ]}
            onPress={() => handleLogin('ela')}
            activeOpacity={0.8}
            disabled={loadingUser !== null}
          >
            <View style={[styles.avatarBadge, styles.avatarLuysa]}>
              <Text style={styles.avatarText}>L</Text>
            </View>
            <Text style={styles.userName}>Luysa</Text>
            <Text style={styles.userRole}>Ela</Text>
          </TouchableOpacity>

          {/* Leonardo (Eu) */}
          <TouchableOpacity
            style={[
              styles.userCard,
              styles.userCardLeonardo,
              loadingUser === 'eu' && styles.userCardSelected,
            ]}
            onPress={() => handleLogin('eu')}
            activeOpacity={0.8}
            disabled={loadingUser !== null}
          >
            <View style={[styles.avatarBadge, styles.avatarLeonardo]}>
              <Text style={styles.avatarText}>L</Text>
            </View>
            <Text style={styles.userName}>Leonardo</Text>
            <Text style={styles.userRole}>Eu</Text>
          </TouchableOpacity>
        </View>

        {/* Footer message */}
        <Text style={styles.footerText}>Compartilhado com amor ♡</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.8,
  },
  logoContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoHeart: {
    fontSize: 44,
    color: COLORS.headerAccent,
    zIndex: 2,
    textShadowColor: 'rgba(200, 90, 124, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  logoRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 34,
    color: '#ffffff',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.headerSub,
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 60,
  },
  userCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    paddingVertical: 24,
    alignItems: 'center',
    position: 'relative',
  },
  userCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: COLORS.headerAccent,
  },
  userCardLuysa: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  userCardLeonardo: {
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  avatarBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarLuysa: {
    backgroundColor: '#e6b3c5', // Pinkish
  },
  avatarLeonardo: {
    backgroundColor: '#b3c7dd', // Bluish
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 11,
    color: COLORS.headerSub,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.headerSub,
    opacity: 0.6,
    letterSpacing: 0.5,
  },
});
