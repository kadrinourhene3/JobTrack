import { z } from 'zod';

const optionalUrl = z.union([z.url('Enter a valid URL.'), z.literal('')]);
export const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.'),
  lastName: z.string().trim().min(2, 'Last name is required.'),
  phone: z.string().trim().max(30),
  country: z.string().trim().max(100),
  city: z.string().trim().max(100),
  currentJobTitle: z.string().trim().max(160),
  yearsOfExperience: z.string().refine(value => !value || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 80), 'Enter a valid number.'),
  careerGoal: z.string().max(3000),
  skills: z.string().max(1000),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});
export type ProfileFormValues = z.infer<typeof profileSchema>;
