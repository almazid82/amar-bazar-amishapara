# Amar Bazar Phase 7 Release Preparation Report

**Status: Not release-ready.** Phase 7 configuration and runbooks are prepared. No APK, AAB, production deployment, live order, live WhatsApp message, or Play Store submission was produced or performed.

## Completed

- Set Android package identifier to `com.amarbazar.customer` and local version to `1.0.0` / version code `1`.
- Added an Amar Bazar icon asset and connected it to the app icon, adaptive launcher icon, and branded splash screen.
- Declared internet access and blocked currently unnecessary camera, location, microphone, contacts, and media/storage permissions.
- Added EAS build profiles for an internal-test APK and a production AAB.
- Documented local checks, EAS build instructions, production backend verification, backups, WhatsApp configuration, end-to-end acceptance, and Google Play preparation.

## Build and validation evidence

- App configuration was inspected. The local Expo project uses Expo SDK 58 and React Native 0.88.
- No EAS account/project linkage or EAS CLI is configured here; no Android SDK, Gradle, or ADB is available. Therefore an installable APK and production AAB could not be generated or device-tested.
- Production Supabase project details, production environment values, and Meta WhatsApp credentials are unavailable. Production migrations, RLS, Edge Functions, backups, live ordering, admin processing, and WhatsApp delivery were not verified.
- The prior security review recorded moderate transitive advisories affecting `glob` and `minimatch`. These remain a release gate until resolved or assessed and documented.
- No Google Play account/credentials were provided or used.
- No production services, customer data, Git history, remote repository, or store listing were changed.

## Owner actions required

1. Link the app to an Expo EAS project and add preview/production Supabase URL and publishable key to the matching EAS environments.
2. Build and install the preview APK; validate the complete test order journey using test data.
3. Verify the production Supabase schema, RLS, Edge Functions, secrets, backups and restore procedure with the project owner.
4. Configure official Meta WhatsApp Cloud API credentials and an approved template as server-side secrets; run a controlled test before enabling live notifications.
5. Resolve or document the dependency advisory decision and complete privacy/store declarations.
6. Build the AAB. Review it and explicitly approve any later Play Console submission; this preparation did not submit it.

See [BUILD_GUIDE.md](BUILD_GUIDE.md) and [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for the exact steps and stop conditions.
