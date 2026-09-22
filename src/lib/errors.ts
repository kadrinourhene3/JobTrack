export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const rawMessage = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const message = rawMessage.toLowerCase();
  if (message.includes('invalid login')) return 'The email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.';
  if (message.includes('already registered')) return 'An account already exists for this email.';
  if (message.includes('password should be')) return 'Choose a stronger password and try again.';
  if (message.includes('rate limit') || message.includes('too many requests')) return 'Too many attempts. Wait a moment, then try again.';
  if (message.includes('jwt expired') || message.includes('invalid jwt') || message.includes('session') && message.includes('expired')) return 'Your session expired. Please sign in again.';
  if (message.includes('row-level security') || message.includes('violates row-level security') || message.includes('permission denied')) return 'You do not have permission to access that item.';
  if (message.includes('invalid api key') || message.includes('no api key') || message.includes('project not found')) return 'The Supabase connection settings are invalid. Check the project URL and publishable key.';
  if (message.includes('network') || message.includes('fetch')) return 'You appear to be offline. Check your connection and try again.';
  if (message.includes('supabase_configuration_invalid')) return 'The Supabase connection settings are invalid. Check the values in .env and restart Expo.';
  if (message.includes('supabase_not_configured')) return 'Connect Supabase in your environment to use this feature.';
  return fallback;
}
