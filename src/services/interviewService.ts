import { requireSupabase } from '../lib/supabase';
import type { InterviewFormValues } from '../schemas/interviewSchema';

export type Interview = {
  id: string; application_id: string; interview_type: string; scheduled_at: string; duration_minutes: number;
  interviewer_name: string | null; interviewer_email: string | null; meeting_link: string | null;
  location: string | null; notes: string | null; status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
};

async function userId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser(); if (error) throw error; if (!data.user) throw new Error('Authentication is required.'); return data.user.id;
}

function row(values: InterviewFormValues) { return { application_id: values.applicationId, interview_type: values.interviewType, scheduled_at: values.scheduledAt, duration_minutes: values.durationMinutes, interviewer_name: values.interviewerName || null, interviewer_email: values.interviewerEmail || null, meeting_link: values.meetingLink || null, location: values.location || null, notes: values.notes || null }; }

export async function getUpcomingInterviews(): Promise<Interview[]> {
  const { data, error } = await requireSupabase().from('interviews').select('*').eq('status', 'SCHEDULED').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(20); if (error) throw error; return data as Interview[];
}
export async function getApplicationInterviews(applicationId: string): Promise<Interview[]> {
  const { data, error } = await requireSupabase().from('interviews').select('*').eq('application_id', applicationId).order('scheduled_at', { ascending: false }); if (error) throw error; return data as Interview[];
}
export async function createInterview(values: InterviewFormValues): Promise<Interview> {
  const { data, error } = await requireSupabase().from('interviews').insert({ ...row(values), user_id: await userId() }).select('*').single(); if (error) throw error; return data as Interview;
}
export async function updateInterview(id: string, values: Partial<InterviewFormValues>): Promise<Interview> {
  const patch = { application_id: values.applicationId, interview_type: values.interviewType, scheduled_at: values.scheduledAt, duration_minutes: values.durationMinutes, interviewer_name: values.interviewerName, interviewer_email: values.interviewerEmail, meeting_link: values.meetingLink, location: values.location, notes: values.notes };
  const { data, error } = await requireSupabase().from('interviews').update(patch).eq('id', id).select('*').single(); if (error) throw error; return data as Interview;
}
async function setStatus(id: string, status: Interview['status']): Promise<Interview> { const { data, error } = await requireSupabase().from('interviews').update({ status }).eq('id', id).select('*').single(); if (error) throw error; return data as Interview; }
export const cancelInterview = (id: string) => setStatus(id, 'CANCELLED');
export const completeInterview = (id: string) => setStatus(id, 'COMPLETED');
export async function deleteInterview(id: string): Promise<void> { const { error } = await requireSupabase().from('interviews').delete().eq('id', id); if (error) throw error; }
