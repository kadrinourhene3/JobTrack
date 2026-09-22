import { requireSupabase } from '../lib/supabase';
import { getDocuments, type StoredDocument } from './documentService';
import { getApplicationInterviews, type Interview } from './interviewService';

export type ActivityLog = { id: string; event_type: string; title: string; metadata: Record<string, unknown>; created_at: string };
export type ApplicationContext = { interviews: Interview[]; documents: StoredDocument[]; activity: ActivityLog[] };

export async function getApplicationContext(applicationId: string): Promise<ApplicationContext> {
  const [interviews, documents, activityResult] = await Promise.all([
    getApplicationInterviews(applicationId),
    getDocuments(applicationId),
    requireSupabase().from('activity_logs').select('id,event_type,title,metadata,created_at').eq('application_id', applicationId).order('created_at', { ascending: false }).limit(30),
  ]);
  if (activityResult.error) throw activityResult.error;
  return { interviews, documents, activity: activityResult.data as ActivityLog[] };
}
