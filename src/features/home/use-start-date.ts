import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RELATIONSHIP_START_ISO } from '@/constants/config';

const START_DATE_STORAGE_KEY = '@relationship_start_date';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Valida uma data no formato AAAA-MM-DD (formato e existência no calendário). */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

interface UseStartDateResult {
  /** Data de início do namoro (AAAA-MM-DD). */
  startIso: string;
  /** Persiste uma nova data. Retorna false se a data for inválida ou a gravação falhar. */
  saveStartDate: (newIso: string) => Promise<boolean>;
}

/**
 * Data de início do relacionamento, persistida em AsyncStorage,
 * com fallback para RELATIONSHIP_START_ISO da config.
 */
export function useStartDate(): UseStartDateResult {
  const [startIso, setStartIso] = useState<string>(RELATIONSHIP_START_ISO);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(START_DATE_STORAGE_KEY)
      .then(stored => {
        if (!cancelled && stored && isValidIsoDate(stored)) {
          setStartIso(stored);
        }
      })
      .catch(() => {
        // Falha de leitura não é crítica: mantém o padrão da config.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveStartDate = useCallback(async (newIso: string): Promise<boolean> => {
    if (!isValidIsoDate(newIso)) return false;
    try {
      await AsyncStorage.setItem(START_DATE_STORAGE_KEY, newIso);
      setStartIso(newIso);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { startIso, saveStartDate };
}
