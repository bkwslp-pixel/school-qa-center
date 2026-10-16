# School QA Center v1.0 — Next.js + Supabase

Starter web application based on the supplied dashboard screenshot. It includes a responsive Thai dashboard, sample chart data, a Supabase browser client, and email/password sign-in.

## Requirements
- Node.js 20.9 or later
- Existing Supabase project with the School QA Center schema and RLS migrations applied

## Run locally
1. Install Node.js if needed.
2. Extract this ZIP and open a terminal in the project folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env.local`.
5. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project URL and publishable/anon key from Supabase Project Settings → API.
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open `http://localhost:3000`.

## Supabase notes
- Use a **publishable key** (or legacy anon key) in the browser. Never use a `service_role` key in `NEXT_PUBLIC_*` variables.
- Create user accounts in Supabase Authentication. This starter currently provides sign-in, not public self-registration.
- The dashboard attempts to read `schools`, `evidence_records`, `tasks`, and `indicators` after sign-in. RLS will only return data permitted to that user.
- For a school-scoped account to see school data, the authenticated user needs a `profiles` row and an appropriate `user_roles` row. The current RLS migration does not provide a public self-service bootstrap flow; seed the first school/admin securely using the Supabase SQL Editor or a trusted server-side admin process.
- Empty or denied queries are not evidence that RLS is broken; verify that the account has a role and that records exist.
- This is a starter: the KPI chart, assessment distribution, education-level summary, and some table badges are still sample values. They must be replaced with aggregated database queries before operational use.
- Google Drive integration is not implemented yet. Do not store public links to confidential evidence. Add an authenticated integration or use short-lived links after checking access.

## Current scope
- Responsive dashboard inspired by the screenshot
- Sidebar navigation placeholders for future modules
- Supabase email/password sign-in and sign-out
- Initial live reads from the existing schema
- Clear mock/live connection status

## Next development steps
1. Secure first-admin bootstrap and profile creation.
2. Build full CRUD for standards/indicators, evidence, evaluation cycles, evaluations, tasks, and reviewer access.
3. Replace remaining sample KPIs and chart series with real aggregates.
4. Add audit logging, validation, loading/error states per module, and tests for each role's RLS access.
5. Implement Google Drive connection and file permission checks.
