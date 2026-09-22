import type { Application, ApplicationStatus } from './types/domain';

export type Status = Application['status'];

const base = (rawStatus: ApplicationStatus, favorite = false) => ({ rawStatus, favorite, archived: false });

export const applications: Application[] = [
  { id: '1', company: 'Linear', title: 'Product Designer', location: 'San Francisco', mode: 'Remote', age: '2 days ago', status: 'Interview', priority: 'High', salary: '$145k–175k', initials: 'L', logoColor: '#5B5FEF', ...base('INTERVIEW', true) },
  { id: '2', company: 'Arc', title: 'Frontend Engineer', location: 'New York', mode: 'Hybrid', age: '4 days ago', status: 'Screening', priority: 'Medium', salary: '$135k–165k', initials: 'A', logoColor: '#E84E89', ...base('SCREENING') },
  { id: '3', company: 'Notion', title: 'Design Engineer', location: 'Dublin', mode: 'Remote', age: '1 week ago', status: 'Applied', priority: 'High', initials: 'N', logoColor: '#15171C', ...base('APPLIED') },
  { id: '4', company: 'Stripe', title: 'UX Engineer', location: 'London', mode: 'On-site', age: '9 days ago', status: 'Saved', priority: 'Low', salary: '£90k–110k', initials: 'S', logoColor: '#635BFF', ...base('SAVED') },
  { id: '5', company: 'Raycast', title: 'Product Engineer', location: 'Amsterdam', mode: 'Remote', age: '2 weeks ago', status: 'Offer', priority: 'High', initials: 'R', logoColor: '#FF6363', ...base('OFFER') },
];
