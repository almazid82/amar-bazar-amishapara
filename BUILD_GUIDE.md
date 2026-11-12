# Amar Bazar Android Build Guide

This guide prepares a review APK and a Google Play Android App Bundle (AAB). The release configuration is present, but no APK/AAB has been built in this workspace because it has no Expo EAS project/account linkage and no Android SDK or Gradle installation.

## App configuration

- App name: `Amar Bazar`
- Android application ID: `com.amarbazar.customer`
- Deep link scheme: `amarbazar`
- Current app version: `1.0.0` (`versionCode: 1`)
- Preview profile: internal distribution APK
- Production profile: Android App Bundle
- Launch artwork: `apps/customer/assets/app-icon.png`, used for the app icon, adaptive icon and splash screen
- Permissions: internet access only; camera, location, contacts, microphone and media/storage access are blocked because the current app does not need them.

The icon artwork is a branded placeholder prepared for this build. Review it on a real Android launcher before release. If a future feature genuinely needs location or another permission, add it deliberately and disclose its purpose in the app and Play listing.

## One-time setup

Use a computer with a supported Node.js release and an Expo account. From PowerShell:

```powershell
cd "C:\Users\shams\Documents\Codex\2026-11-05\ne\outputs\amar-bazar-prototype\apps\customer"
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` links this app to an Expo project and adds its project ID to the Expo configuration. Keep that ID in source control; it is not a secret. Do not proceed if Expo cannot confirm that the project belongs to your account.

In the Expo dashboard, create `preview` and `production` environment values for the customer app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These are public client configuration values, not substitutes for database security. Keep Row Level Security enabled. Never add a Supabase service-role key, Meta token, worker secret, or any other server credential to the mobile app or an `EXPO_PUBLIC_` variable. Do not set production values until the production Supabase project and policies have been reviewed.

## Build an installable test APK

After Expo project linking and preview environment setup:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

When EAS completes, download the APK from the build page or the link printed by EAS. Install it on a test Android device. Before testing, confirm the build is pointed at a non-production backend with test data.

## Build a Play-ready AAB

Only after the release gates in `DEPLOYMENT_GUIDE.md` are satisfied:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Download the `.aab` from the EAS build page. This creates an artifact; it does not upload or submit it to Google Play. Do not run an EAS submit command until the owner explicitly approves submission.

Before every new Play release, increment both `expo.version` and Android `versionCode` in `app.json`. Back up the Android signing credentials and ensure the same signing identity is retained for future updates. EAS-managed signing can be configured during the first Android build; review the account and credential prompts carefully and keep recovery access with the project owner.

## Local preview checks

The customer app can be inspected as a web/Metro preview without an Android SDK, but that is not an installable Android build. From `apps/customer`, run:

```powershell
$env:EXPO_HOME = Join-Path (Get-Location) ".expo-home"
$env:EXPO_NO_TELEMETRY = "1"
$env:EXPO_OFFLINE = "1"
pnpm run typecheck
pnpm exec expo export --platform android
```

These checks use the locally installed project dependencies. A successful Android bundle export does not prove that an APK/AAB can install or that production services work.

## Current limitations

- Expo account/project ID and EAS CLI are not configured in this workspace.
- Android SDK, Gradle, and ADB are unavailable locally.
- Production Supabase URL/key and production Meta credentials are not present.
- No physical-device install, production order, or live WhatsApp delivery was executed.
- The previous security review recorded moderate transitive dependency advisories for `glob` and `minimatch`; resolve or formally assess these before a public release.
