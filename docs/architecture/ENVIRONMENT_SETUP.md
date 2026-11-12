# Amar Bazar — Environment Setup

**Purpose:** identify configuration names and safe placement. This file intentionally contains no secret values. Local `.env` presence at the Phase 0 audit was: root, `apps/admin`, `apps/customer`, and `supabase/functions` all absent; remote/EAS/Supabase secret state remains **UNVERIFIED**.

## Configuration principles

- Use distinct Supabase projects and credentials for local development, staging and production.
- Never copy production credentials into local dev, staging, logs, screenshots or repository files.
- `EXPO_PUBLIC_*`, `VITE_*`, and any website bundle config become visible in browser/app artifacts. Only Supabase URL and publishable/anon key belong there; RLS must protect data.
- Service-role keys, internal worker secrets and Meta credentials stay server-side in Supabase Edge Function secrets.
- `.env.example` contains names/placeholders only; actual `.env` files stay ignored and untracked.
- Supabase project URL/keys in checked-in configuration do not prove that a remote project exists or is configured.

## Variable inventory

Presence refers only to evidence available in the local Phase 0 workspace. Values are intentionally omitted.

| Variable name | Required by | Sensitivity / location | Local evidence/status |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Android customer app | Public project URL; Expo preview/staging/production environment | Example exists; local `.env` absent; remote EAS value UNVERIFIED |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Android customer app | Public publishable/anon key; client build | Example exists; local `.env` absent; remote EAS value UNVERIFIED |
| `VITE_SUPABASE_URL` | Admin dashboard; proposed Vite-bundled root website | Public project URL | Admin example exists; local `.env` absent; Pages/CI value UNVERIFIED |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Admin dashboard; proposed Vite-bundled root website | Public publishable/anon key | Admin example exists; local `.env` absent; Pages/CI value UNVERIFIED |
| `SUPABASE_URL` | Edge Functions / worker / user client | Server config; URL is not secret but keep per environment | Function example exists; local function env absent; deployed value UNVERIFIED |
| `SUPABASE_ANON_KEY` **or** `SUPABASE_PUBLISHABLE_KEY` | `_shared/userClient.ts` for user-JWT verification and PostgREST/RPC calls | Publishable/anon key, server function environment | Code requires one of these; current `supabase/functions/.env.example` does not list either; value status UNVERIFIED |
| `SUPABASE_SERVICE_ROLE_KEY` | Notification worker and signed webhook service client | **Secret**; Supabase Edge Function secrets only | Name present in example; local env absent; deployed value UNVERIFIED |
| `AMAR_BAZAR_WORKER_SECRET` | `notification-worker` request authentication | **Secret**; worker caller + Edge Function secret store | Name present in example; local env absent; scheduling/caller not verified |
| `META_ACCESS_TOKEN` | WhatsApp worker | **Secret**; Edge Function secrets only | Name present in example; local env absent; Meta state UNVERIFIED |
| `META_PHONE_NUMBER_ID` | WhatsApp worker | Server-side Meta configuration (identifier, not authentication secret) | Name present in example; local env absent; Meta state UNVERIFIED |
| `META_API_VERSION` | WhatsApp worker | Server-side supported Graph API version | Name present as placeholder; local env absent; current supported version must be confirmed at setup |
| `META_TEMPLATE_LANGUAGE` | WhatsApp worker | Non-secret template language code | Example sets default; remote template configuration UNVERIFIED |
| `ADMIN_WHATSAPP_PHONE` | WhatsApp worker | Sensitive operational contact; server-side only | Name present as placeholder; local env absent |
| `WHATSAPP_DRY_RUN` | WhatsApp worker | Server-side feature flag; should be `true` until live approval | Example defaults true; deployed value UNVERIFIED |
| `META_WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook GET subscription verification | **Secret**; server-side only | Name present as placeholder; local env absent |
| `META_APP_SECRET` | WhatsApp webhook signature verification | **Secret**; server-side only | Name present as placeholder; local env absent |

### Configuration gap to address before local Edge Function testing

`getUserClient()` reads `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`, but `supabase/functions/.env.example` lists neither. Add the correct variable name to the example/setup guide only after confirming which key format the chosen Supabase project supports. Do not place a service-role key in this slot.

### Existing fixed/non-secret config

- `supabase/config.toml` identifies local project slug `amar-bazar` and local Auth redirect settings; it is not a remote project credential.
- `apps/customer/app.json` contains an EAS owner/project ID and Android package ID. These identify build ownership/package metadata and do not prove current EAS environment values or build status.
- No Google Maps key, SMS vendor secret, transactional-email credentials, production domain or production Supabase project ID was found in the environment variable references inspected.

## Where values belong

### Local development

- `apps/customer/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for local Supabase only.
- `apps/admin/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` for local Supabase only.
- If root website is bundled with Vite, its local `.env` can use the same `VITE_*` names for the local project. Current root app does not yet load these names.
- Supabase CLI local function env file: server variables for local-only service; use safe local credentials, not production values.

### Staging and production

- Android public variables in separate EAS `preview` and `production` environments.
- Admin/root public build variables in separate Cloudflare Pages preview/production settings or protected GitHub Environments; build output necessarily contains publishable values.
- Server-only values in each Supabase project's Edge Function secrets. Store separate staging and production Meta credentials/worker secret. Keep WhatsApp dry-run true in staging unless using Meta's test setup with explicit approval.
- DNS and domain validation records are host controls, not application secrets; keep the owner-controlled registrar account protected with MFA.

## Provider/configuration checklist (future; not configured)

- [ ] Create/identify local Supabase CLI/Docker installation and inspect migrations without connecting to production.
- [ ] Confirm staging and production Supabase project IDs, selected region, Auth settings and API key format.
- [ ] Configure Android and admin public client variables per environment.
- [ ] Add missing Edge Functions user-client publishable/anon key to safe setup instructions.
- [ ] Configure SMS provider, sender/route availability in Bangladesh, rate limits and spend alert.
- [ ] Configure admin email auth and stronger authentication/MFA decision.
- [ ] Configure Meta WhatsApp business app, approved templates, consent policy and webhook secrets.
- [ ] Configure production site/admin domains and HTTPS; no domain has been purchased or verified.
- [ ] Configure scheduled outbox worker caller securely; current worker authorization exists but deployment/scheduler is unverified.
- [ ] Configure backups, retention, restore target, health alerts and on-call contact.

Never ask an AI chat to print `.env` values. Share variable names, redacted presence and error messages only.
