// Upload de foto no NATIVO (iOS/Android): converte o base64 do image picker
// em ArrayBuffer e envia para o Storage.

import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import type { PickedPhoto } from './picked-photo';

export interface UploadedPhoto {
  url: string;
  key: string;
}

function extFromPhoto(fileName?: string | null, mimeType?: string | null): string {
  if (fileName && fileName.includes('.')) return fileName.split('.').pop() as string;
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('heic')) return 'heic';
  return 'jpg';
}

export async function uploadPickedPhoto(photo: PickedPhoto): Promise<UploadedPhoto> {
  if (!photo.base64) throw new Error('Imagem sem dados para enviar.');
  const ext = extFromPhoto(photo.fileName, photo.mimeType);
  const path = `memories/${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
  const { error } = await supabase.storage
    .from('memories')
    .upload(path, decode(photo.base64), { contentType: photo.mimeType ?? 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from('memories').getPublicUrl(path);
  return { url: data.publicUrl, key: path };
}
