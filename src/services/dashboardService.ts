import { requireSupabase } from '../lib/supabase';
import type { Goal } from './goalService';
import type { Interview } from './interviewService';
import type { CareerTask } from './taskService';

export type DashboardData = { upcomingInterviews: Interview[]; activeGoals: Goal[]; nextTasks: CareerTask[] };

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const [interviews, goals, tasks] = await Promise.all([
    requireSupabase().from('interviews').select('*').eq('status', 'SCHEDULED').gte('scheduled_at', now).order('scheduled_at').limit(5),
    requireSupabase().from('goals').select('*').lte('starts_at', today).gte('ends_at', today).order('period'),
    requireSupabase().from('tasks').select('*').eq('completed', false).order('deadline').limit(5),
  ]);
  const error = interviews.error || goals.error || tasks.error;
  if (error) throw error;
  return { upcomingInterviews: interviews.data as Interview[], activeGoals: goals.data as Goal[], nextTasks: tasks.data as CareerTask[] };
}
