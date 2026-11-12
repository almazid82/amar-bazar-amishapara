# Amar Bazar — Infrastructure Cost Estimate

**Currency:** USD unless stated otherwise.  
**Price reference date:** 2026-11-09. Provider pricing changes; these are planning ranges, not a quote. No accounts, subscriptions, domains or paid services were purchased.

## Suggested low-cost plan

| Stage | Approximate fixed cost | Notes |
|---|---:|---|
| Local development | $0 platform fee | Local tools and developer computer; SMS/Meta are not live. |
| Staging | $0 on Supabase Free if kept as a separate free-plan organization/project; or about $10/month additional default compute when paired with a Pro organization | Free projects may pause after 7 days of low activity and have no managed daily backups. Same-org plans are not mixed. |
| Live web/admin hosting | $0 initial on Cloudflare Pages Free | Domain registration/renewal is separate; Pages limits currently include 500 builds/month, 20,000 files and 25 MiB per static asset. |
| Live Supabase | From $25/month for Pro, one production project/default Micro compute included | Adds non-pausing project and daily backups (7-day retention), subject to usage/add-ons/overage. |
| Expo/EAS Android build | $0 within Free quota, or $19/month Starter | Current Free includes 15 Android and 15 iOS builds/month at low priority. Starter includes $45 monthly build credits for $19; paid usage beyond credits can cost extra. |
| Google Play full distribution | $25 one-time registration fee | Required to publish publicly to Google Play; account eligibility and verification still apply. |
| GitHub Actions CI | $0 on standard hosted runners for public repositories; private repositories depend on plan allowance | Keep artifact storage and private runner usage within account quota. |
| Domain | Variable annual registrar/registry price | Depends on TLD and registrar; confirm renewal, taxes, privacy and .bd availability before buying. |
| OTP SMS | Variable, per route/provider/volume | Supabase Auth requires an SMS delivery/provider setup for real customer phone OTP; no provider or Bangladesh route pricing was configured. |
| WhatsApp Cloud API | Variable by recipient market, template/message category and current Meta rate card | Direct API avoids a BSP platform subscription, but Meta message billing and business setup can still apply. Keep dry-run until consent/template/price are confirmed. |
| Maps | Potentially $0 at small usage, then SKU-based | Current Google Maps pricing offers free monthly caps by SKU (most Essentials SKUs 10,000 events; Maps SDK/embed have distinct terms); billing and quota controls are required for paid services. |

Official references: [Supabase pricing](https://supabase.com/pricing), [Supabase billing rules](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase backup policy](https://supabase.com/docs/guides/platform/backups), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Expo plan limits](https://docs.expo.dev/billing/plans/), [Google Play registration](https://support.google.com/googleplay/android-developer/answer/6112435), [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/overview), [WhatsApp Business Platform pricing](https://business.whatsapp.com/products/platform-pricing), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Monthly baseline scenarios

### A. Development / pilot preview (no live orders)

- Local Supabase: $0 platform subscription (developer compute still applies).
- Static preview hosting: $0 on Cloudflare Pages; do not use GitHub Pages for a transaction-oriented commercial ordering site.
- Expo Free plan within 15 Android builds/month: $0.
- Domain: optional, annual cost depends on chosen domain.
- SMS/WhatsApp: $0 if not sending; do not send real customer messages in test mode.
- **Estimated recurring baseline:** $0/month plus optional domain and any paid SMS/map/API use.

### B. One live production project + separate free staging

- Supabase Pro production project: from $25/month.
- Separate free staging project/organization: $0, with pause/no-managed-backup limitations.
- Cloudflare Pages: $0 base hosting.
- Expo: $0 within free build quota.
- **Estimated recurring baseline:** about $25/month plus domain renewal, OTP SMS, WhatsApp messages, any Maps paid usage and optional EAS paid plan.

### C. Production + active paid staging project in same Pro organization

- Supabase Pro subscription: $25/month.
- A second project uses its own compute; the current default additional project price starts around $10/month after available compute credits.
- **Planning estimate:** approximately $35/month for two default-size projects under the same Pro organization before overages/add-ons. Confirm in the billing estimator at provisioning time.
- Hosting/EAS/domain/message fees remain separate.

## Free tier limits and production implications

### Supabase

Current Free plan advertises 2 active projects, 500 MB database per project, 5 GB egress, 1 GB file storage and up to 50,000 monthly active users, but free projects can pause after 7 days of low activity and do not include automated backups. That makes it suitable for local evaluation or synthetic staging, not a reliable production order backend. Current Pro starts at $25/month; includes the first Micro compute via credits, 250 GB egress and daily backups retained 7 days. Additional project compute and usage can increase the bill. See official pricing/billing pages above.

### Cloudflare Pages

Free Pages currently allows 500 builds/month, 20,000 files, 25 MiB max static file and 100 custom domains per project. Pages Functions consume Workers quota. Customer/admin static bundles should fit comfortably, but large unoptimized images and server-side Functions change the cost model. A free plan still has no availability SLA implied by this estimate.

### Expo

The Free plan allows a limited low-priority build allowance (currently 15 Android + 15 iOS per month) and is usually enough during a low-frequency pilot. Paid Starter is currently $19/month and includes $45 in build credits; additional usage may be billed. EAS is optional—local Android builds avoid EAS subscription costs but require a configured local SDK/build environment.

## Variable/contingent items to budget

1. **Domain:** annual registration and renewal; TLD-specific registry price, local tax, DNS services and email are separate. Verify the exact renewal price, not only first-year discount.
2. **OTP:** Supabase Auth’s SMS delivery is not a free SMS network. Provider costs vary by destination, sender route and failed/retried messages; obtain Bangladesh-specific quote and configure limits.
3. **WhatsApp:** use Meta’s current Bangladesh rate card. Costs vary by delivered template category and recipient market; approved templates and business account setup are needed. A provider/BSP would add its own fee if used, but this architecture prefers the official Cloud API directly.
4. **Maps/location:** simple Google Maps embed or Android Maps SDK may be under free allowance, while Places, geocoding and route APIs are billed by SKU. Use budget alerts, quotas and a cost ceiling before enabling address autocomplete/live routing.
5. **Email:** password reset/admin email or transactional email may need a provider. Supabase Auth email delivery limits/custom SMTP plan requirements must be checked before relying on it.
6. **Backups/log retention/monitoring:** daily backups available on eligible paid Supabase plans; PITR, longer retention, log drains or external monitoring can add recurring cost. Add off-site storage for product photos and logical dumps.
7. **Store commissions/payment:** current model is COD; card/mobile-financial-service gateway fees are not included. If later added, include gateway transaction fees, settlement and refund accounting.
8. **Google Play:** one-time $25 account registration for full distribution; taxes/payment exchange costs may vary. App sales/paid digital items would invoke additional platform rules, but not part of this COD grocery flow.

## Cost controls recommended

- Keep Supabase Pro spend cap on initially; set usage alerts. Track DB size, egress, Storage, Auth MAU and Edge Function invocation/runtime.
- Use optimized responsive images, CDN caching and limited product image sizes.
- Set SMS/WhatsApp and Maps provider daily/monthly budget alerts; never retry an expensive notification blindly.
- Limit staging data and purge only synthetic data with reviewed procedures.
- Keep `WHATSAPP_DRY_RUN=true` until an owner-approved live test.
- Re-evaluate plan after actual pilot volumes (orders/day, OTP attempts, image traffic and message count) are known.
