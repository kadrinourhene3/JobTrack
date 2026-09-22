import * as DocumentPicker from 'expo-document-picker';
import { requireSupabase } from '../lib/supabase';
import { createUuid } from '../lib/uuid';

export type DocumentType = 'RESUME' | 'COVER_LETTER' | 'CERTIFICATE' | 'PORTFOLIO' | 'APPLICATION' | 'OTHER';
export type StoredDocument = { id: string; application_id: string | null; document_type: DocumentType; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string };

async function userId(): Promise<string> { const { data, error } = await requireSupabase().auth.getUser(); if (error) throw error; if (!data.user) throw new Error('Authentication is required.'); return data.user.id; }
function safeName(name: string): string { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-'); }
function folder(type: DocumentType): string { if (type === 'RESUME') return 'resumes'; if (type === 'COVER_LETTER') return 'cover-letters'; return 'documents'; }

export async function pickAndUploadDocument(type: DocumentType, applicationId?: string): Promise<StoredDocument | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'], copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (asset.size && asset.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
  const owner = await userId();
  const parent = applicationId ? `applications/${applicationId}` : folder(type);
  const storagePath = `users/${owner}/${parent}/${createUuid()}-${safeName(asset.name)}`;
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  const client = requireSupabase();
  const { error: uploadError } = await client.storage.from('jobtrack-documents').upload(storagePath, bytes, { contentType: asset.mimeType || 'application/octet-stream', upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from('documents').insert({ user_id: owner, application_id: applicationId || null, document_type: type, name: asset.name, storage_path: storagePath, mime_type: asset.mimeType || null, size_bytes: asset.size || null }).select('*').single();
  if (error) { await client.storage.from('jobtrack-documents').remove([storagePath]); throw error; }
  return data as StoredDocument;
}

export async function getDocuments(applicationId?: string): Promise<StoredDocument[]> { let query = requireSupabase().from('documents').select('*').order('created_at', { ascending: false }); query = applicationId ? query.eq('application_id', applicationId) : query.is('application_id', null); const { data, error } = await query; if (error) throw error; return data as StoredDocument[]; }
export async function getAllDocuments(): Promise<StoredDocument[]> { const { data, error } = await requireSupabase().from('documents').select('*').order('created_at', { ascending: false }); if (error) throw error; return data as StoredDocument[]; }
export async function getResumeDocuments(): Promise<StoredDocument[]> { const { data, error } = await requireSupabase().from('documents').select('*').eq('document_type', 'RESUME').order('created_at', { ascending: false }); if (error) throw error; return data as StoredDocument[]; }
export async function getTemporaryDocumentUrl(storagePath: string): Promise<string> { const { data, error } = await requireSupabase().storage.from('jobtrack-documents').createSignedUrl(storagePath, 60); if (error) throw error; return data.signedUrl; }
export async function renameDocument(document: StoredDocument, name: string): Promise<StoredDocument> { const nextPath = document.storage_path.replace(/[^/]+$/, `${createUuid()}-${safeName(name)}`); const client = requireSupabase(); const { error: moveError } = await client.storage.from('jobtrack-documents').move(document.storage_path, nextPath); if (moveError) throw moveError; const { data, error } = await client.from('documents').update({ name, storage_path: nextPath }).eq('id', document.id).select('*').single(); if (error) { await client.storage.from('jobtrack-documents').move(nextPath, document.storage_path); throw error; } return data as StoredDocument; }
export async function deleteDocument(document: StoredDocument): Promise<void> { const client = requireSupabase(); const { error: storageError } = await client.storage.from('jobtrack-documents').remove([document.storage_path]); if (storageError) throw storageError; const { error } = await client.from('documents').delete().eq('id', document.id); if (error) throw error; }
