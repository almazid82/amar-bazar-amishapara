# Amar Bazar Customer App

Android-first customer application built with Expo, React Native, TypeScript, Expo Router and Supabase.

## Configure the backend

1. Apply the reviewed Supabase migrations to a local Supabase stack and configure phone OTP. Keep order acceptance disabled until active shops, products, delivery areas, fees and COD policy are reviewed.
2. Copy `.env.example` to `.env` and set the local Supabase URL and publishable key. Never add service-role or WhatsApp secrets to this app.
3. Start the app from this folder:

```powershell
Copy-Item .env.example .env
# Edit .env with the local values shown by `supabase status`.
pnpm install
pnpm start -- --lan
```

Scan the terminal QR with Expo Go on an Android device on the same Wi-Fi, or run `pnpm android` with an Android emulator configured. If LAN access is blocked by the router or Windows Firewall, use `pnpm start -- --tunnel`.

Android Emulator reaches a local Supabase service through `http://10.0.2.2:54321`. A physical phone must use the computer's LAN address for the Supabase URL. The API URL must be reachable from the device, not just from the computer.

## Customer journey

- Browse active categories and products anonymously; product prices, availability, delivery areas and settings load from Supabase.
- Search filters the live catalog. Product images use public Storage URLs and fall back to local category imagery only when a product image is not configured.
- Cart contents persist on device. Displayed subtotal is an estimate; the app submits only product IDs and quantities.
- Phone OTP is required before checkout. Delivery addresses are stored against the signed-in customer account.
- Orders submit through the `create-order` Edge Function with a persisted idempotency key. PostgreSQL validates stock and current prices and calculates the estimate.
- A successful response means “request received / pending verification,” not order confirmation. The shop checks availability and prices; the customer must approve the current quote before it is confirmed.
- Order history and details read only the signed-in customer's RLS-protected rows. Order detail listens for Realtime updates when enabled and can be manually refreshed.
- COD is shown from store settings. No card or online payment is implemented.

## Local checks

```powershell
pnpm run typecheck
pnpm run check
```

The full customer journey needs a reachable local Supabase database with migrations applied, active catalog/area values, phone OTP configured, and `orders_enabled` plus `cod_enabled` set appropriately. The repository seed intentionally creates no products and leaves `orders_enabled` false. Without those prerequisites, the app shows setup/error/empty states and will not display a mock successful order.

The original marketing website remains separate at the repository root.
