import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfileCompletion, normalizeSkills } from '../src/utils/profileCompletion.ts';

function profile(overrides = {}) {
  return {
    id: 'user-1', email: 'user@example.com', first_name: null, last_name: null,
    avatar_path: null, phone: null, country: null, city: null,
    current_job_title: null, years_of_experience: null, career_goal: null,
    skills: [], linkedin_url: null, github_url: null, portfolio_url: null,
    onboarding_completed: true, created_at: '', updated_at: '', ...overrides,
  };
}

test('profile completion is calculated from actual fields', () => {
  const empty = calculateProfileCompletion(profile());
  const partial = calculateProfileCompletion(profile({
    first_name: 'Nourhene', last_name: 'User', current_job_title: 'Mobile Developer',
    city: 'Algiers', country: 'Algeria', skills: ['React Native'],
  }));
  assert.equal(empty.percentage, 0);
  assert.equal(partial.percentage, 40);
  assert.ok(partial.completed.some(item => item.key === 'role'));
  assert.ok(partial.completed.some(item => item.key === 'location'));
  assert.ok(partial.completed.some(item => item.key === 'skills'));
});

test('completion recommendation follows the first real missing field', () => {
  const result = calculateProfileCompletion(profile({ first_name: 'Nourhene', last_name: 'User' }));
  assert.equal(result.recommendation, 'Add a profile photo.');
  assert.notEqual(result.recommendation, 'Add a portfolio link to stand out.');
});

test('completing a missing field increases the percentage immediately', () => {
  const before = calculateProfileCompletion(profile({ first_name: 'Nourhene', last_name: 'User' }));
  const after = calculateProfileCompletion(profile({ first_name: 'Nourhene', last_name: 'User', current_job_title: 'Backend Developer' }));
  assert.equal(after.percentage, before.percentage + 10);
});

test('skills remove blanks and case-insensitive whitespace duplicates', () => {
  assert.deepEqual(normalizeSkills([' React Native ', '', 'react   native', 'TypeScript', 'typescript ']), ['React Native', 'TypeScript']);
});

test('portfolio recommendation only appears when it is the next missing item', () => {
  const almostComplete = profile({
    first_name: 'Nourhene', last_name: 'User', avatar_path: 'users/user-1/avatar.jpg',
    current_job_title: 'Mobile Developer', city: 'Algiers', skills: ['React Native'],
    years_of_experience: 4, career_goal: 'Build reliable mobile products',
    linkedin_url: 'https://linkedin.com/in/user', github_url: 'https://github.com/user',
  });
  const result = calculateProfileCompletion(almostComplete);
  assert.equal(result.percentage, 90);
  assert.equal(result.recommendation, 'Add a portfolio link to stand out.');
});
