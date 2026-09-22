import { z } from 'zod';
import { APPLICATION_STATUS_VALUES } from '../applicationStatuses';

export const applicationSchema = z.object({
  companyName: z.string().trim().min(2, 'Company is required.').max(120),
  jobTitle: z.string().trim().min(2, 'Role is required.').max(160),
  location: z.string().trim().max(160).optional(),
  jobUrl: z.union([z.url('Enter a valid URL.'), z.literal('')]).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  status: z.enum(APPLICATION_STATUS_VALUES),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  source: z.string().trim().max(80).optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  currency: z.string().length(3),
  notes: z.string().max(5000).optional(),
}).refine(values => !values.salaryMin || !values.salaryMax || Number(values.salaryMax) >= Number(values.salaryMin), {
  message: 'Maximum salary must be greater than the minimum.',
  path: ['salaryMax'],
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
