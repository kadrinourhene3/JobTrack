import { requireSupabase } from '../lib/supabase';
import { toDisplayStatus } from '../applicationStatuses';
import type { ApplicationFormValues } from '../schemas/applicationSchema';
import type { Application, ApplicationRow, ApplicationStatus } from '../types/domain';

function relativeAge(date: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
}

function formatSalary(row: ApplicationRow): string | undefined {
  if (!row.salary_min && !row.salary_max) return undefined;
  const formatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 });
  const min = row.salary_min ? formatter.format(row.salary_min) : '';
  const max = row.salary_max ? formatter.format(row.salary_max) : '';
  return `${row.currency} ${min}${min && max ? '–' : ''}${max}`;
}

function logoColor(company: string): string {
  const colors = ['#5B5FEF', '#7C3AED', '#3B82F6', '#0F9F6E', '#D97706', '#E0527A'];
  const hash = [...company].reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company_name,
    title: row.job_title,
    location: row.location || 'Location not set',
    mode: row.work_mode === 'ONSITE' ? 'On-site' : row.work_mode ? `${row.work_mode.charAt(0)}${row.work_mode.slice(1).toLowerCase()}` : 'Not set',
    age: relativeAge(row.application_date || row.created_at),
    status: toDisplayStatus(row.status),
    priority: `${row.priority.charAt(0)}${row.priority.slice(1).toLowerCase()}` as Application['priority'],
    salary: formatSalary(row),
    initials: row.company_name.slice(0, 1).toUpperCase(),
    logoColor: logoColor(row.company_name),
    rawStatus: row.status,
    userId: row.user_id,
    description: row.job_description || undefined,
    notes: row.notes || undefined,
    jobUrl: row.job_url || undefined,
    recruiterName: row.recruiter_name || undefined,
    recruiterEmail: row.recruiter_email || undefined,
    recruiterPhone: row.recruiter_phone || undefined,
    source: row.source || undefined,
    applicationDate: row.application_date || undefined,
    deadline: row.deadline || undefined,
    favorite: row.favorite,
    archived: row.archived,
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Authentication is required.');
  return data.user.id;
}

export async function getApplications(options: { archived?: boolean; page?: number; pageSize?: number } = {}): Promise<Application[]> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 50;
  const from = (page - 1) * pageSize;
  const { data, error } = await requireSupabase().from('applications').select('*').eq('archived', options.archived || false).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return (data as ApplicationRow[]).map(mapApplication);
}

export async function getApplicationById(id: string): Promise<Application> {
  const { data, error } = await requireSupabase().from('applications').select('*').eq('id', id).single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

function toRow(values: ApplicationFormValues) {
  return {
    company_name: values.companyName,
    job_title: values.jobTitle,
    location: values.location || null,
    job_url: values.jobUrl || null,
    work_mode: values.workMode,
    status: values.status,
    priority: values.priority,
    source: values.source || null,
    salary_min: values.salaryMin ? Number(values.salaryMin) : null,
    salary_max: values.salaryMax ? Number(values.salaryMax) : null,
    currency: values.currency,
    notes: values.notes || null,
  };
}

export async function createApplication(values: ApplicationFormValues): Promise<Application> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase().from('applications').insert({ ...toRow(values), application_date: new Date().toISOString(), user_id: userId }).select('*').single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

export async function updateApplication(id: string, values: Partial<ApplicationFormValues>): Promise<Application> {
  const complete = values as ApplicationFormValues;
  const patch = values.companyName && values.jobTitle && values.workMode && values.status && values.priority && values.currency ? toRow(complete) : {
    company_name: values.companyName,
    job_title: values.jobTitle,
    location: values.location,
    job_url: values.jobUrl,
    work_mode: values.workMode,
    status: values.status,
    priority: values.priority,
    source: values.source,
    salary_min: values.salaryMin ? Number(values.salaryMin) : undefined,
    salary_max: values.salaryMax ? Number(values.salaryMax) : undefined,
    currency: values.currency,
    notes: values.notes,
  };
  const { data, error } = await requireSupabase().from('applications').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await requireSupabase().from('applications').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveApplication(id: string): Promise<Application> {
  const { data, error } = await requireSupabase().from('applications').update({ archived: true }).eq('id', id).select('*').single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<Application> {
  const { data, error } = await requireSupabase().from('applications').update({ favorite }).eq('id', id).select('*').single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application> {
  const { data, error } = await requireSupabase().from('applications').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return mapApplication(data as ApplicationRow);
}

export async function duplicateApplication(id: string): Promise<Application> {
  const source = await getApplicationById(id);
  return createApplication({
    companyName: source.company,
    jobTitle: `${source.title} (copy)`,
    location: source.location,
    jobUrl: source.jobUrl || '',
    workMode: source.mode === 'On-site' ? 'ONSITE' : source.mode === 'Hybrid' ? 'HYBRID' : 'REMOTE',
    status: 'SAVED',
    priority: source.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
    source: source.source || '',
    salaryMin: '', salaryMax: '', currency: 'USD', notes: source.description || '',
  });
}
