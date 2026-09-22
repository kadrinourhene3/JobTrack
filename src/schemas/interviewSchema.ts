import { z } from 'zod';

export const interviewSchema = z.object({
  applicationId: z.uuid(),
  interviewType: z.enum(['HR Screening','Technical Interview','Behavioral Interview','Manager Interview','Final Interview','Case Study','Coding Challenge']),
  scheduledAt: z.iso.datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  interviewerName: z.string().trim().max(120).optional(),
  interviewerEmail: z.union([z.email(), z.literal('')]).optional(),
  meetingLink: z.union([z.url(), z.literal('')]).optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().max(5000).optional(),
});
export type InterviewFormValues = z.infer<typeof interviewSchema>;
