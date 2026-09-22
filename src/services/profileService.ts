import * as ImagePicker from 'expo-image-picker';
import { requireSupabase } from '../lib/supabase';
import { createUuid } from '../lib/uuid';
import type { Profile } from '../types/domain';

async function currentUserId(): Promise<string> { const { data, error } = await requireSupabase().auth.getUser(); if (error) throw error; if (!data.user) throw new Error('Authentication is required.'); return data.user.id; }

export async function pickAndUploadAvatar(): Promise<Profile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo access is required to choose an avatar.');
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
  if (picked.canceled) return null;
  const owner = await currentUserId();
  const asset = picked.assets[0];
  const extension = asset.mimeType?.split('/')[1] || 'jpg';
  const path = `users/${owner}/avatar-${createUuid()}.${extension}`;
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  const client = requireSupabase();
  const { error: uploadError } = await client.storage.from('avatars').upload(path, bytes, { contentType: asset.mimeType || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from('profiles').update({ avatar_path: path }).eq('id', owner).select('*').single();
  if (error) throw error;
  return data as Profile;
}

export async function getAvatarUrl(path: string): Promise<string> { const { data, error } = await requireSupabase().storage.from('avatars').createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; }
