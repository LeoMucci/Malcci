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
  const mime = mimeType?.toLowerCase() || '';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('mov')) return 'mov';
  if (mime.includes('video')) return 'mp4';
  return 'jpg';
}

export async function uploadPickedPhoto(photo: PickedPhoto): Promise<UploadedPhoto> {
  const ext = extFromPhoto(photo.fileName, photo.mimeType);
  const path = `memories/${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
  
  let body: any;
  if (photo.base64) {
    body = decode(photo.base64);
  } else {
    // Sincroniza via blob para arquivos grandes ou vídeos no React Native
    const response = await fetch(photo.uri);
    body = await response.blob();
  }

  const { error } = await supabase.storage
    .from('memories')
    .upload(path, body, { contentType: photo.mimeType ?? 'image/jpeg' });

  if (error) throw error;
  const { data } = supabase.storage.from('memories').getPublicUrl(path);
  return { url: data.publicUrl, key: path };
}
