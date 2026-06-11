// Upload de foto na WEB: envia o objeto File do <input> direto para o Storage.

import { supabase } from '@/lib/supabase';
import type { PickedPhoto } from './picked-photo';

export interface UploadedPhoto {
  url: string;
  key: string;
}

export async function uploadPickedPhoto(photo: PickedPhoto): Promise<UploadedPhoto> {
  if (!photo.file) throw new Error('Arquivo de imagem inválido.');
  const ext = photo.file.name.split('.').pop() || 'jpg';
  const path = `memories/${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
  const { error } = await supabase.storage.from('memories').upload(path, photo.file);
  if (error) throw error;
  const { data } = supabase.storage.from('memories').getPublicUrl(path);
  return { url: data.publicUrl, key: path };
}
