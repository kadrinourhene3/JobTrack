import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(3000).optional(),
  applicationId: z.union([z.uuid(), z.literal('')]).optional(),
  deadline: z.union([z.iso.datetime(), z.literal('')]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const goalSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional(),
  period: z.enum(['WEEKLY', 'MONTHLY']),
  metric: z.enum(['APPLICATIONS', 'RECRUITER_CONTACTS', 'INTERVIEWS', 'RESUME_IMPROVEMENTS', 'CUSTOM']),
  target: z.number().int().positive(),
  startsAt: z.iso.date(),
  endsAt: z.iso.date(),
}).refine(value => value.endsAt >= value.startsAt, { path: ['endsAt'], message: 'End date must be after the start date.' });

export type TaskFormValues = z.infer<typeof taskSchema>;
export type GoalFormValues = z.infer<typeof goalSchema>;
