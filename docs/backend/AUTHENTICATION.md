# Authentication and roles

## Customers

- Supabase Auth phone OTP is the existing customer approach in the Android app.
- `auth.uid()` is the customer identity. `profiles` is synchronized from Auth user creation/phone changes. Customer addresses and order reads are scoped by that ID.
- SMS provider setup, delivery in Bangladesh, OTP rate limits and production redirects are not configured or verified.
- Phone OTP authenticates an account; it does not confirm an order. Confirmation remains shop verification followed by explicit approval of the current quote.
- The static root website currently has no backend authentication. It must not be treated as a production ordering client until it uses customer authentication and the same backend APIs.

## Staff and administrators

- The existing admin UI uses Supabase email/password sign-in, then calls `current_staff_roles()`.
- Staff records live in private `app_private.admin_profiles` and `app_private.user_roles`, not editable user metadata.
- `admin` manages users and has administrative authority; `order_operator` works with quotes, order state, delivery and COD; `catalog_manager` manages catalog/inventory operations according to the RPC checks.
- Role assignment is not self-service: `assign_staff_role` requires an active admin. Provision and revoke staff using the separately reviewed bootstrap procedure only in a safe environment.
- UI route guards are convenience only. Every business RPC verifies `auth.uid()` and role server-side; RLS restricts reads.
- MFA, sign-in rate limits, recovery flows, session lifetime and staff offboarding have not been verified in a live Auth project. Require strong unique staff credentials and enable MFA if supported by the chosen configuration.

## Edge Function identity

Customer and staff functions use `getUserClient()`: they validate the incoming bearer JWT with Supabase Auth, then call RPCs with the same user token so Postgres sees the real `auth.uid()` and role. The user client needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` server environment values. A publishable/anon key is not a service-role key.

The notification worker and signed webhook use a server-only service client. The worker additionally checks an internal secret. Service credentials must remain in Supabase Edge Function secrets and never in `VITE_*`, `EXPO_PUBLIC_*`, a web bundle, GitHub Pages artifact or app binary.

## Account lifecycle

1. Customer signs in using OTP and has only customer policy access.
2. An owner provisions a staff Auth identity, then assigns least-privilege role(s) through controlled setup.
3. Role revocation removes/turns off private role state; active staff capability must disappear on subsequent authorization checks.
4. Test customer A, customer B, anonymous, catalog manager, order operator, active admin and revoked staff separately in staging.

No production identity, OTP delivery, staff bootstrap or account revocation was exercised in this phase.
