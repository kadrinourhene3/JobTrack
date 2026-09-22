import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must contain at least 8 characters.'),
});

export const signUpSchema = signInSchema.extend({
  firstName: z.string().trim().min(2, 'Enter your first name.'),
  lastName: z.string().trim().min(2, 'Enter your last name.'),
  password: z.string().min(8, 'Use at least 8 characters.').regex(/[A-Z]/, 'Add one uppercase letter.').regex(/[0-9]/, 'Add one number.'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.').regex(/[A-Z]/, 'Add one uppercase letter.').regex(/[0-9]/, 'Add one number.'),
  confirmPassword: z.string(),
}).refine(values => values.password === values.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
