# JobTrack

JobTrack is a production-oriented Expo mobile application for managing a complete job search: applications, interviews, follow-ups, goals, documents, analytics, and AI-assisted career preparation. Its interface is designed as a premium career-tech product with intentional light and dark themes.

## Features

- Email/password authentication, verification, password recovery, persisted sessions, and protected application routes
- Guided profile onboarding and editable career profile with private avatar storage
- Application CRUD architecture with favorites, archive, duplicate, search, filters, and optimistic Kanban status changes
- Application detail context for interviews, recruiter information, notes, private documents, and activity history
- Dashboard metrics, live pipeline, upcoming interview query, active goals, tasks, and recent applications
- Analytics calculated from source application data rather than duplicated database totals
- Resume Analyzer, Job Match, Cover Letter, and Interview Coach provider architecture
- Private PDF/DOCX resume extraction and a JWT-verified Supabase Edge Function for real AI analysis
- Local notification permission and reminder scheduling service
- Semantic design tokens, responsive layouts, skeleton/empty/error states, toasts, confirmation dialogs, and subtle motion

## Screens

- Splash, Welcome, Sign Up, Sign In, Forgot Password, Reset Password, Email Verification
- Onboarding and Profile
- Home dashboard
- Applications list and mobile Kanban
- Application details
- AI Career hub, Resume Analyzer, Job Match, Cover Letter, Interview Coach
- Analytics

## Technology

- Expo SDK 57, React 19.2, React Native 0.86, TypeScript
- Supabase Auth, PostgreSQL, Storage, Row Level Security, and Edge Functions
- Zustand for auth, application, and local settings state
- React Hook Form and Zod for validated forms
- AsyncStorage for Supabase sessions and appearance preference

## Architecture

```text
App / protected route gate
├── screens                 Presentation and screen-local interaction
├── components              Reusable visual primitives and validated forms
├── stores                  Auth, applications, and local settings coordination
├── services                Supabase queries, storage, AI, and notifications
├── schemas                 Zod form contracts
├── hooks                   Debouncing and scoped server-data loaders
├── lib                     Supabase client and friendly error mapping
└── types                   Domain and database-facing models

supabase
├── migrations              PostgreSQL schema, indexes, RLS, triggers, storage policies
└── functions/ai-career     Authenticated AI provider boundary
```

Screens never contain service-role credentials or AI provider secrets. User identity is resolved from the persisted Supabase session, while RLS independently enforces ownership.

## Expo setup

Requirements: Node.js 22.13 or newer, npm, Expo Go or a native simulator.

```bash
npm install
cp .env.example .env
npm start
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Run a platform directly:

```bash
npm run android
npm run ios
npm run web
```

iOS native simulation requires macOS and Xcode. Physical iOS devices can use Expo Go during compatible development workflows.
The latest Expo Go requires the CLI and device app to be signed in to the same Expo account. Run `npx expo login` before starting the development server.

## Supabase setup

1. Create or open a Supabase project.
2. In the project Dashboard, open **Connect**. Copy the **Project URL** and **Publishable key**. You can also find keys under **Settings > API Keys**. Use a publishable key (`sb_publishable_...`) for new projects; the legacy anon key also works.
3. Copy `.env.example` to `.env` and replace both placeholders:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Despite the compatibility variable name, `EXPO_PUBLIC_SUPABASE_ANON_KEY` accepts the current publishable key. Never put a secret key, legacy service-role key, database password, or AI provider key in an `EXPO_PUBLIC_` variable. Restart Metro after changing `.env`:

```bash
npx expo start --clear
```

4. Install/use the Supabase CLI, authenticate, link this folder, inspect the migration plan, and apply it:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push --dry-run
npx supabase db push
```

5. In **Authentication > Providers > Email**, keep Email enabled. Enable **Confirm email** for the verification flow used by JobTrack.
6. In **Authentication > URL Configuration**, add these Redirect URLs:

```text
jobtrack://auth/verified
jobtrack://auth/reset-password
```

For Expo Go development, also add the exact URLs produced by the running Expo project (normally `exp://YOUR-LAN-IP:8081/--/auth/verified` and `exp://YOUR-LAN-IP:8081/--/auth/reset-password`). Use wildcard development URLs only in a non-production Supabase project.

7. The migration creates the database schema, trigger, RLS policies, and both private Storage buckets. Verify **Storage** contains:

```text
avatars             private, 5 MB, PNG/JPEG/WebP
jobtrack-documents  private, 10 MB, PDF/DOC/DOCX/PNG/JPEG
```

Without Supabase environment variables, an explicit demo entry is available only in a development build. Production builds never fall back to demo data. When valid credentials are present, authentication and every persisted feature use Supabase.

## Database and security

The initial migration creates profiles, applications, tags, interviews, preparation items, tasks, goals, documents, cover letters, resume/job-match analyses, AI interview sessions/messages, activity logs, and notifications.

Every user-owned table has Row Level Security enabled. Mutable resources have owner-scoped `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies; activity logs are client-readable but server-written. Nested resources verify both their own `user_id` and parent ownership. Privileged ownership helpers live in a non-exposed `private` schema with an empty search path. Storage is private and objects must be rooted beneath:

```text
users/{authenticatedUserId}/resumes/
users/{authenticatedUserId}/cover-letters/
users/{authenticatedUserId}/applications/{applicationId}/
```

Never add a Supabase service-role key to `.env`, Expo configuration, or client code.

## AI configuration

The mobile application invokes only the JWT-protected `ai-career` Edge Function. `supabase/config.toml` keeps `verify_jwt = true`; the function also resolves the current user from the bearer token and all writes still pass through RLS.

Choose one mode explicitly. Mock mode is only for Interview Coach development. Resume Analyzer, Job Match, Tailor Resume, and Cover Letter fail clearly in mock mode and never return realistic-looking fake career results:

```bash
npx supabase secrets set AI_PROVIDER=mock
```

For production with the built-in OpenAI Responses API provider, set all three server-only secrets. Choose a structured-output-capable model available to your OpenAI project:

```bash
npx supabase secrets set AI_PROVIDER=openai
npx supabase secrets set OPENAI_API_KEY=your-openai-api-key
npx supabase secrets set OPENAI_MODEL=your-model-id
```

Alternatively, configure the existing server-side external provider adapter:

```bash
npx supabase secrets set AI_PROVIDER=external
npx supabase secrets set AI_PROVIDER_URL=https://your-server-side-provider-endpoint
npx supabase secrets set AI_PROVIDER_API_KEY=your-secret
```

Then deploy and confirm the configured secrets:

```bash
npx supabase functions deploy ai-career
npx supabase secrets list
```

The same values can be added in **Edge Functions > Secrets** in the Supabase Dashboard. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEYS` are supplied automatically by Supabase and should not be manually copied into app code. No provider secret is required for explicit mock mode. External mode fails closed if its URL or key is missing; it never silently switches to mock output.

For every selected resume, the function queries the `documents` row under the verified user, validates its private `users/{auth.uid()}/...` path, and downloads it through the authenticated Storage client. It accepts text-based PDF and DOCX files up to 10 MB, extracts at most 80,000 characters, rejects empty/scanned/unreadable documents, and never logs document text. PDF extraction uses `unpdf`'s serverless PDF.js build (maximum 50 pages); DOCX extraction uses Mammoth raw-text extraction. The extracted text is sent only from the Edge Function to the configured provider.

The OpenAI adapter calls `POST /v1/responses` with `store: false` and a strict action-specific JSON schema. The external endpoint continues to receive `{ action, payload }` with its key in the bearer header; when a resume is selected, `payload.document.text` contains the validated extracted content rather than a Storage URL. Provider responses are validated again before persistence.

## Real environment verification

After deploying, run this sequence on a development device against the real project:

1. Sign up with a new email and confirm it from the received link.
2. In **Authentication > Users**, confirm the user exists. In **Table Editor > profiles**, confirm one row exists with the same UUID as `auth.users.id`.
3. Finish onboarding, reload the app, and confirm the persisted session returns directly to the authenticated workspace.
4. Create, edit, change status, favorite, archive, and delete an application. Reload between operations to confirm database persistence.
5. Create/update/delete an interview, task, and goal. Upload, rename, open through a signed URL, and delete a document.
6. Invoke an AI action and confirm a resume/job-match analysis row is owned by the signed-in user when that action persists a result.
7. Sign out, relaunch, and confirm protected screens remain inaccessible. Use **Forgot password**, open the reset link, change the password, and sign in with the new password.
8. Create a second test user and verify it cannot read, update, delete, or create relationships to the first user's records or Storage paths.
9. Temporarily use an invalid client key and verify the app shows a connection error rather than demo data; then restore the real key and clear Metro's cache.

## Validation

```bash
npm run typecheck
npx expo install --check
npx expo-doctor@latest
npx --yes deno check --config supabase/functions/ai-career/deno.json supabase/functions/ai-career/index.ts supabase/functions/ai-career/documentText.ts supabase/functions/ai-career/errors.ts supabase/functions/ai-career/providers.ts supabase/functions/ai-career/types.ts supabase/functions/ai-career/documentText.test.ts supabase/functions/ai-career/providers.test.ts
npx --yes deno lint --config supabase/functions/ai-career/deno.json supabase/functions/ai-career
npx --yes deno test --allow-env --config supabase/functions/ai-career/deno.json supabase/functions/ai-career/documentText.test.ts supabase/functions/ai-career/providers.test.ts
npx expo export --platform android --output-dir dist/android
npx expo export --platform ios --output-dir dist/ios
npx expo export --platform web --output-dir dist/web
```

## Screenshots

Add portfolio screenshots here after connecting the target Supabase project:

- `docs/screenshots/dashboard-light.png`
- `docs/screenshots/applications-dark.png`
- `docs/screenshots/application-detail.png`
- `docs/screenshots/ai-resume-analysis.png`
- `docs/screenshots/analytics.png`

## Future improvements

- Google OAuth after provider and native redirect configuration
- Push-token registration and remote notification delivery
- Offline mutation queue and conflict reconciliation
- Drag gestures for Kanban status movement
- Server-side full-text search and cursor pagination for very large pipelines
- Automated database policy tests and end-to-end mobile tests
