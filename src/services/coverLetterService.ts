import { requireSupabase } from '../lib/supabase';

export type CoverLetterRecord = {
  id: string;
  application_id: string | null;
  resume_document_id: string | null;
  title: string;
  tone: string;
  length: string;
  key_strengths: string[];
  content: string;
  created_at: string;
  updated_at: string;
};

export async function saveCoverLetter(values: { applicationId: string; resumeDocumentId?: string; title: string; tone: string; length: string; keyStrengths: string[]; content: string }): Promise<string> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Authentication is required.');
  const { data, error } = await client.from('cover_letters').insert({
    user_id: userData.user.id,
    application_id: values.applicationId,
    resume_document_id: values.resumeDocumentId || null,
    title: values.title,
    tone: values.tone,
    length: values.length,
    key_strengths: values.keyStrengths,
    content: values.content,
  }).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function getCoverLetters(): Promise<CoverLetterRecord[]> {
  const { data, error } = await requireSupabase().from('cover_letters').select('*').order('updated_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data as CoverLetterRecord[];
}
