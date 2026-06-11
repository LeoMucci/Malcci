import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

let channelCounter = 0;

/**
 * Recarrega dados quando qualquer uma das tabelas muda no Supabase Realtime.
 * `onChange` é guardado em ref — pode ser uma função inline sem causar re-subscribe.
 *
 * Requer que as tabelas estejam na publication `supabase_realtime`
 * (Dashboard > Database > Replication).
 */
export function useRealtimeRefresh(tables: readonly string[], onChange: () => void): void {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  const tablesKey = tables.join(',');

  useEffect(() => {
    if (!isSupabaseConfigured || !tablesKey) return;

    channelCounter += 1;
    const channel = supabase.channel(`rt-refresh-${channelCounter}`);
    for (const table of tablesKey.split(',')) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => callbackRef.current(),
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tablesKey]);
}
