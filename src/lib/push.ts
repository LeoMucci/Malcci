// Notificações push (Expo). Registro só roda no nativo (iOS/Android) e degrada
// graciosamente sem projectId do EAS ou sem permissão. O envio usa a Expo Push
// API e funciona de qualquer plataforma (inclusive web mandando para o celular).

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { isSupabaseConfigured, supabase } from './supabase';

// Mostra a notificação mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  return (typeof fromExtra === 'string' && fromExtra) ? fromExtra : (fromEas ?? undefined);
}

/** Registra o dispositivo e guarda o token em users.push_token (nativo). */
export async function registerForPush(userId: number): Promise<void> {
  if (Platform.OS === 'web' || !isSupabaseConfigured) return;
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos do casal',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('Push: defina extra.eas.projectId (rode `eas init`) para habilitar notificações.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) {
      await supabase.from('users').update({ push_token: token }).eq('id', userId);
    }
  } catch (e) {
    console.warn('Falha ao registrar push:', e);
  }
}

/** Envia um push para o usuário destino, se ele tiver token salvo. */
export async function sendPushToUser(userId: number, title: string, body: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data } = await supabase.from('users').select('push_token').eq('id', userId).single();
    const token = (data as { push_token?: string | null } | null)?.push_token;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch (e) {
    console.warn('Falha ao enviar push:', e);
  }
}
