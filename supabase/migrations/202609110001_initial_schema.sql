-- JobTrack production schema. Apply with `supabase db push`.
create extension if not exists pgcrypto;
create schema if not exists private;

create type public.application_status as enum ('SAVED','APPLIED','SCREENING','ASSESSMENT','INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED','REJECTED','WITHDRAWN');
create type public.application_priority as enum ('LOW','MEDIUM','HIGH');
create type public.work_mode as enum ('REMOTE','HYBRID','ONSITE');
create type public.interview_status as enum ('SCHEDULED','COMPLETED','CANCELLED');
create type public.goal_period as enum ('WEEKLY','MONTHLY');
create type public.document_type as enum ('RESUME','COVER_LETTER','CERTIFICATE','PORTFOLIO','APPLICATION','OTHER');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  avatar_path text,
  phone text,
  country text,
  city text,
  current_job_title text,
  years_of_experience integer check (years_of_experience between 0 and 80),
  career_goal text,
  skills text[] not null default '{}',
  linkedin_url text,
  github_url text,
  portfolio_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  company_logo_path text,
  job_title text not null check (char_length(job_title) between 1 and 160),
  job_description text,
  job_url text,
  location text,
  work_mode public.work_mode,
  employment_type text,
  salary_min numeric(14,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14,2) check (salary_max is null or salary_max >= 0),
  currency char(3) not null default 'USD',
  application_date timestamptz,
  deadline timestamptz,
  recruiter_name text,
  recruiter_email text,
  recruiter_phone text,
  source text,
  notes text,
  status public.application_status not null default 'SAVED',
  priority public.application_priority not null default 'MEDIUM',
  favorite boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_range_valid check (salary_min is null or salary_max is null or salary_max >= salary_min)
);

create table public.application_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#6B7280',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.application_tag_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  tag_id uuid not null references public.application_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (application_id, tag_id)
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  interview_type text not null check (interview_type in ('HR Screening','Technical Interview','Behavioral Interview','Manager Interview','Final Interview','Case Study','Coding Challenge')),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 5 and 480),
  interviewer_name text,
  interviewer_email text,
  meeting_link text,
  location text,
  notes text,
  status public.interview_status not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_preparation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  item_type text not null check (item_type in ('QUESTION','ANSWER','STAR_STORY','RECRUITER_QUESTION','NOTE')),
  title text,
  content text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  deadline timestamptz,
  priority public.application_priority not null default 'MEDIUM',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  period public.goal_period not null,
  metric text not null check (metric in ('APPLICATIONS','RECRUITER_CONTACTS','INTERVIEWS','RESUME_IMPROVEMENTS','CUSTOM')),
  target integer not null check (target > 0),
  current_value integer not null default 0 check (current_value >= 0),
  starts_at date not null,
  ends_at date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_dates_valid check (ends_at >= starts_at)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  document_type public.document_type not null,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  resume_document_id uuid references public.documents(id) on delete set null,
  title text not null,
  tone text not null check (tone in ('PROFESSIONAL','CONFIDENT','CONCISE','ENTHUSIASTIC')),
  length text not null check (length in ('SHORT','MEDIUM','LONG')),
  key_strengths text[] not null default '{}',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  overall_score smallint not null check (overall_score between 0 and 100),
  ats_score smallint not null check (ats_score between 0 and 100),
  impact_score smallint not null check (impact_score between 0 and 100),
  keywords_score smallint not null check (keywords_score between 0 and 100),
  readability_score smallint not null check (readability_score between 0 and 100),
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  missing_keywords jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  provider text not null default 'mock',
  created_at timestamptz not null default now()
);

create table public.job_match_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  application_id uuid references public.applications(id) on delete cascade,
  overall_match smallint not null check (overall_match between 0 and 100),
  skills_match smallint not null check (skills_match between 0 and 100),
  experience_match smallint not null check (experience_match between 0 and 100),
  education_match smallint not null check (education_match between 0 and 100),
  keywords_match smallint not null check (keywords_match between 0 and 100),
  matched_skills jsonb not null default '[]',
  missing_skills jsonb not null default '[]',
  important_keywords jsonb not null default '[]',
  recommended_changes jsonb not null default '[]',
  provider text not null default 'mock',
  created_at timestamptz not null default now(),
  constraint match_has_source check (document_id is not null or application_id is not null)
);

create table public.ai_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  interview_type text not null,
  difficulty text not null check (difficulty in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ABANDONED')),
  overall_score smallint check (overall_score between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_interview_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.ai_interview_sessions(id) on delete cascade,
  role text not null check (role in ('ASSISTANT','USER','FEEDBACK')),
  content text not null,
  feedback jsonb,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  event_type text not null,
  title text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null,
  entity_type text,
  entity_id uuid,
  scheduled_for timestamptz,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Query indexes.
create index applications_user_status_idx on public.applications(user_id, status) where archived = false;
create index applications_user_created_idx on public.applications(user_id, created_at desc);
create index applications_search_idx on public.applications using gin (to_tsvector('simple', company_name || ' ' || job_title || ' ' || coalesce(location,'') || ' ' || coalesce(recruiter_name,'')));
create index interviews_user_schedule_idx on public.interviews(user_id, scheduled_at) where status = 'SCHEDULED';
create index tasks_user_deadline_idx on public.tasks(user_id, deadline) where completed = false;
create index goals_user_period_idx on public.goals(user_id, period, starts_at, ends_at);
create index documents_user_application_idx on public.documents(user_id, application_id);
create index application_tag_links_application_idx on public.application_tag_links(application_id);
create index application_tag_links_tag_idx on public.application_tag_links(tag_id);
create index interview_preparation_interview_idx on public.interview_preparation(interview_id);
create index tasks_application_idx on public.tasks(application_id) where application_id is not null;
create index cover_letters_application_idx on public.cover_letters(application_id) where application_id is not null;
create index resume_analyses_document_idx on public.resume_analyses(document_id);
create index job_match_document_idx on public.job_match_analyses(document_id) where document_id is not null;
create index job_match_application_idx on public.job_match_analyses(application_id) where application_id is not null;
create index ai_sessions_application_idx on public.ai_interview_sessions(application_id) where application_id is not null;
create index activity_application_created_idx on public.activity_logs(application_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index interview_messages_session_idx on public.ai_interview_messages(session_id, created_at);

-- Server-owned timestamps and auth profile bootstrap.
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = pg_catalog.now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger interviews_updated_at before update on public.interviews for each row execute function public.set_updated_at();
create trigger preparation_updated_at before update on public.interview_preparation for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger cover_letters_updated_at before update on public.cover_letters for each row execute function public.set_updated_at();
create trigger ai_sessions_updated_at before update on public.ai_interview_sessions for each row execute function public.set_updated_at();

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (new.id, coalesce(new.email,''), new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.log_application_activity() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs(user_id, application_id, event_type, title) values(new.user_id, new.id, 'APPLICATION_CREATED', 'Application created');
  elsif old.status is distinct from new.status then
    insert into public.activity_logs(user_id, application_id, event_type, title, metadata)
    values(new.user_id, new.id, 'STATUS_CHANGED', 'Status changed', pg_catalog.jsonb_build_object('from', old.status, 'to', new.status));
  else
    insert into public.activity_logs(user_id, application_id, event_type, title) values(new.user_id, new.id, 'APPLICATION_UPDATED', 'Application updated');
  end if;
  return new;
end; $$;
create trigger application_activity after insert or update on public.applications for each row execute function private.log_application_activity();

-- Trigger functions execute only through their triggers, never as client-callable RPCs.
revoke all on function public.set_updated_at(), private.handle_new_user(), private.log_application_activity() from public, anon, authenticated;

-- Ownership helpers protect nested records from cross-user relationship injection.
create or replace function private.owns_application(target_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.applications where id = target_id and user_id = (select auth.uid()));
$$;
create or replace function private.owns_interview(target_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.interviews where id = target_id and user_id = (select auth.uid()));
$$;
create or replace function private.owns_document(target_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.documents where id = target_id and user_id = (select auth.uid()));
$$;
create or replace function private.owns_ai_session(target_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.ai_interview_sessions where id = target_id and user_id = (select auth.uid()));
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on function private.owns_application(uuid), private.owns_interview(uuid), private.owns_document(uuid), private.owns_ai_session(uuid) from public, anon;
grant execute on function private.owns_application(uuid), private.owns_interview(uuid), private.owns_document(uuid), private.owns_ai_session(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_tags enable row level security;
alter table public.application_tag_links enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_preparation enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.documents enable row level security;
alter table public.cover_letters enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.job_match_analyses enable row level security;
alter table public.ai_interview_sessions enable row level security;
alter table public.ai_interview_messages enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

-- Authenticated clients receive table privileges; RLS remains the authorization boundary.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Profiles.
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on public.profiles for delete using (id = auth.uid());

-- Direct user-owned tables.
create policy applications_select on public.applications for select using (user_id = auth.uid());
create policy applications_insert on public.applications for insert with check (user_id = auth.uid());
create policy applications_update on public.applications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy applications_delete on public.applications for delete using (user_id = auth.uid());

create policy tags_select on public.application_tags for select using (user_id = auth.uid());
create policy tags_insert on public.application_tags for insert with check (user_id = auth.uid());
create policy tags_update on public.application_tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_delete on public.application_tags for delete using (user_id = auth.uid());

create policy goals_select on public.goals for select using (user_id = auth.uid());
create policy goals_insert on public.goals for insert with check (user_id = auth.uid());
create policy goals_update on public.goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_delete on public.goals for delete using (user_id = auth.uid());

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert with check (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

-- Nested resources verify both direct ownership and parent ownership.
create policy tag_links_select on public.application_tag_links for select using (user_id = auth.uid() and private.owns_application(application_id) and exists(select 1 from public.application_tags t where t.id = tag_id and t.user_id = auth.uid()));
create policy tag_links_insert on public.application_tag_links for insert with check (user_id = auth.uid() and private.owns_application(application_id) and exists(select 1 from public.application_tags t where t.id = tag_id and t.user_id = auth.uid()));
create policy tag_links_update on public.application_tag_links for update using (user_id = auth.uid() and private.owns_application(application_id) and exists(select 1 from public.application_tags t where t.id = tag_id and t.user_id = auth.uid())) with check (user_id = auth.uid() and private.owns_application(application_id) and exists(select 1 from public.application_tags t where t.id = tag_id and t.user_id = auth.uid()));
create policy tag_links_delete on public.application_tag_links for delete using (user_id = auth.uid() and private.owns_application(application_id));

create policy interviews_select on public.interviews for select using (user_id = auth.uid() and private.owns_application(application_id));
create policy interviews_insert on public.interviews for insert with check (user_id = auth.uid() and private.owns_application(application_id));
create policy interviews_update on public.interviews for update using (user_id = auth.uid() and private.owns_application(application_id)) with check (user_id = auth.uid() and private.owns_application(application_id));
create policy interviews_delete on public.interviews for delete using (user_id = auth.uid() and private.owns_application(application_id));

create policy prep_select on public.interview_preparation for select using (user_id = auth.uid() and private.owns_interview(interview_id));
create policy prep_insert on public.interview_preparation for insert with check (user_id = auth.uid() and private.owns_interview(interview_id));
create policy prep_update on public.interview_preparation for update using (user_id = auth.uid() and private.owns_interview(interview_id)) with check (user_id = auth.uid() and private.owns_interview(interview_id));
create policy prep_delete on public.interview_preparation for delete using (user_id = auth.uid() and private.owns_interview(interview_id));

create policy tasks_select on public.tasks for select using (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy tasks_insert on public.tasks for insert with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy tasks_update on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy tasks_delete on public.tasks for delete using (user_id = auth.uid());

create policy documents_select on public.documents for select using (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy documents_insert on public.documents for insert with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy documents_update on public.documents for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy documents_delete on public.documents for delete using (user_id = auth.uid());

create policy cover_letters_select on public.cover_letters for select using (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)) and (resume_document_id is null or private.owns_document(resume_document_id)));
create policy cover_letters_insert on public.cover_letters for insert with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)) and (resume_document_id is null or private.owns_document(resume_document_id)));
create policy cover_letters_update on public.cover_letters for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)) and (resume_document_id is null or private.owns_document(resume_document_id)));
create policy cover_letters_delete on public.cover_letters for delete using (user_id = auth.uid());

create policy resume_analyses_select on public.resume_analyses for select using (user_id = auth.uid() and private.owns_document(document_id));
create policy resume_analyses_insert on public.resume_analyses for insert with check (user_id = auth.uid() and private.owns_document(document_id));
create policy resume_analyses_update on public.resume_analyses for update using (user_id = auth.uid() and private.owns_document(document_id)) with check (user_id = auth.uid() and private.owns_document(document_id));
create policy resume_analyses_delete on public.resume_analyses for delete using (user_id = auth.uid());

create policy matches_select on public.job_match_analyses for select using (user_id = auth.uid() and (document_id is null or private.owns_document(document_id)) and (application_id is null or private.owns_application(application_id)));
create policy matches_insert on public.job_match_analyses for insert with check (user_id = auth.uid() and (document_id is null or private.owns_document(document_id)) and (application_id is null or private.owns_application(application_id)));
create policy matches_update on public.job_match_analyses for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (document_id is null or private.owns_document(document_id)) and (application_id is null or private.owns_application(application_id)));
create policy matches_delete on public.job_match_analyses for delete using (user_id = auth.uid());

create policy ai_sessions_select on public.ai_interview_sessions for select using (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy ai_sessions_insert on public.ai_interview_sessions for insert with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy ai_sessions_update on public.ai_interview_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));
create policy ai_sessions_delete on public.ai_interview_sessions for delete using (user_id = auth.uid());

create policy ai_messages_select on public.ai_interview_messages for select using (user_id = auth.uid() and private.owns_ai_session(session_id));
create policy ai_messages_insert on public.ai_interview_messages for insert with check (user_id = auth.uid() and private.owns_ai_session(session_id));
create policy ai_messages_update on public.ai_interview_messages for update using (user_id = auth.uid() and private.owns_ai_session(session_id)) with check (user_id = auth.uid() and private.owns_ai_session(session_id));
create policy ai_messages_delete on public.ai_interview_messages for delete using (user_id = auth.uid() and private.owns_ai_session(session_id));

create policy activity_select on public.activity_logs for select using (user_id = auth.uid() and (application_id is null or private.owns_application(application_id)));

-- Policies are scoped to authenticated sessions explicitly; anon has no table privileges.
do $$
declare policy_record record;
begin
  for policy_record in
    select policyname, schemaname, tablename
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename::text = any (array[
        'profiles','applications','application_tags','application_tag_links','interviews','interview_preparation',
        'tasks','goals','documents','cover_letters','resume_analyses','job_match_analyses',
        'ai_interview_sessions','ai_interview_messages','activity_logs','notifications'
      ])
  loop
    execute pg_catalog.format('alter policy %I on %I.%I to authenticated', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

-- Private storage. Objects are always rooted at users/{auth.uid()}/...
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('jobtrack-documents', 'jobtrack-documents', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_select_own on storage.objects for select to authenticated using (bucket_id in ('jobtrack-documents','avatars') and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy storage_insert_own on storage.objects for insert to authenticated with check (bucket_id in ('jobtrack-documents','avatars') and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy storage_update_own on storage.objects for update to authenticated using (bucket_id in ('jobtrack-documents','avatars') and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id in ('jobtrack-documents','avatars') and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
create policy storage_delete_own on storage.objects for delete to authenticated using (bucket_id in ('jobtrack-documents','avatars') and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
