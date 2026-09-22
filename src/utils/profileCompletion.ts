import type { Profile } from '../types/domain';

export type ProfileCompletionAction = 'edit' | 'avatar' | 'role' | 'location' | 'skills';

export type ProfileCompletionItem = {
  key: string;
  label: string;
  completed: boolean;
  action: ProfileCompletionAction;
  recommendation: string;
};

export type ProfileCompletion = {
  percentage: number;
  completed: ProfileCompletionItem[];
  missing: ProfileCompletionItem[];
  recommendation: string;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function normalizeSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawSkill of skills) {
    const skill = rawSkill.trim().replace(/\s+/g, ' ');
    const key = skill.toLocaleLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key);
    normalized.push(skill);
  }
  return normalized;
}

export function calculateProfileCompletion(profile: Profile | null): ProfileCompletion {
  const items: ProfileCompletionItem[] = [
    { key: 'name', label: 'Full name', completed: hasText(profile?.first_name) && hasText(profile?.last_name), action: 'edit', recommendation: 'Add your full name.' },
    { key: 'avatar', label: 'Profile photo', completed: hasText(profile?.avatar_path), action: 'avatar', recommendation: 'Add a profile photo.' },
    { key: 'role', label: 'Target role', completed: hasText(profile?.current_job_title), action: 'role', recommendation: 'Add your target role.' },
    { key: 'location', label: 'Job-search location', completed: hasText(profile?.city) || hasText(profile?.country), action: 'location', recommendation: 'Add your preferred job-search location.' },
    { key: 'skills', label: 'Skills', completed: normalizeSkills(profile?.skills || []).length > 0, action: 'skills', recommendation: 'Add the skills you want employers to notice.' },
    { key: 'experience', label: 'Experience level', completed: profile?.years_of_experience !== null && profile?.years_of_experience !== undefined, action: 'edit', recommendation: 'Add your years of experience.' },
    { key: 'goal', label: 'Career goal', completed: hasText(profile?.career_goal), action: 'edit', recommendation: 'Describe your next career goal.' },
    { key: 'linkedin', label: 'LinkedIn link', completed: hasText(profile?.linkedin_url), action: 'edit', recommendation: 'Add your LinkedIn profile.' },
    { key: 'github', label: 'GitHub link', completed: hasText(profile?.github_url), action: 'edit', recommendation: 'Add your GitHub profile if it supports your work.' },
    { key: 'portfolio', label: 'Portfolio link', completed: hasText(profile?.portfolio_url), action: 'edit', recommendation: 'Add a portfolio link to stand out.' },
  ];
  const completed = items.filter(item => item.completed);
  const missing = items.filter(item => !item.completed);
  return {
    percentage: Math.round((completed.length / items.length) * 100),
    completed,
    missing,
    recommendation: missing[0]?.recommendation || 'Your key career details are complete.',
  };
}
