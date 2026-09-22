import type { Session } from '@supabase/supabase-js';
import type { ApplicationStatus, DisplayStatus } from '../applicationStatuses';

export type { ApplicationStatus, DisplayStatus } from '../applicationStatuses';

export type ApplicationPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';

export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  current_job_title: string | null;
  years_of_experience: number | null;
  career_goal: string | null;
  skills: string[];
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_path: string | null;
  job_title: string;
  job_description: string | null;
  job_url: string | null;
  location: string | null;
  work_mode: WorkMode | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  application_date: string | null;
  deadline: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  recruiter_phone: string | null;
  source: string | null;
  notes: string | null;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  company: string;
  title: string;
  location: string;
  mode: string;
  age: string;
  status: DisplayStatus;
  priority: 'High' | 'Medium' | 'Low';
  salary?: string;
  initials: string;
  logoColor: string;
  rawStatus: ApplicationStatus;
  userId?: string;
  description?: string;
  notes?: string;
  jobUrl?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  source?: string;
  applicationDate?: string;
  deadline?: string;
  favorite: boolean;
  archived: boolean;
};

export type AuthSnapshot = {
  session: Session | null;
  profile: Profile | null;
};

export type ResumeAnalysisResult = {
  overallScore: number;
  atsCompatibility: number;
  impact: number;
  keywords: number;
  readability: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  recommendations: string[];
};

export type JobMatchResult = {
  overallMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  keywordsMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
  importantKeywords: string[];
  recommendedChanges: string[];
};

export type TailoredResumeResult = {
  skillsToEmphasize: string[];
  keywordsToAdd: string[];
  summaryImprovements: string[];
  experienceBullets: string[];
  technologiesToMention: string[];
  missingKeywords: string[];
  suggestedWording: string[];
};

export type InterviewQuestionResult = {
  question: string;
  focus: string;
};

export type InterviewFeedbackResult = {
  clarity: number;
  relevance: number;
  structure: number;
  impact: number;
  suggestion: string;
  strengths: string[];
  improvements: string[];
};
