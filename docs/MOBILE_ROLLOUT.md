# Mobile rollout plan

## Current readiness

The app is already a native Expo/React Native project rather than a web wrapper. The same codebase targets Android, iOS, and web.

Completed:

- Expo SDK 57 / React Native mobile project
- Offline subnetting engine and five-challenge mission
- Accessible mobile input and feedback
- Automated domain and interaction tests
- EAS build profiles for development, internal preview, and production
- `expo-dev-client` installed for native development builds
- Dark splash and adaptive-icon background aligned to the app UI

Not yet confirmed:

- Final public app name
- Expo account or organization that will own the project
- Permanent iOS bundle identifier and Android package name
- Apple Developer Program membership
- Google Play Console membership
- Final approved icon, splash mark, and screenshots
- Public privacy-policy and support URLs

Do not enter credentials, recovery codes, signing keys, or API tokens in chat or source control.

## Recommended rollout sequence

### 1. Project ownership and permanent identifiers

Owner: Project owner / operations

Decide before creating either store record:

- Final app name: `[APP NAME]`
- Expo owner or organization: `[EXPO OWNER]`
- iOS bundle identifier: `[IOS BUNDLE ID]`
- Android package name: `[ANDROID PACKAGE]`
- Support email: `[SUPPORT EMAIL]`
- Privacy-policy URL: `[PRIVACY URL]`

Recommended identifier pattern, subject to ownership approval:

```text
com.[PROJECT-OWNED-NAMESPACE].subnetgame
```

Package and bundle identifiers should not be casually changed after store records are created.

### 2. Connect the project to EAS

Run this locally so authentication remains in the project-controlled account:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest build:configure
```

Review any proposed edits before accepting them. The repository already contains `eas.json`; the important result is linking the project and adding the EAS `projectId`/owner metadata.

### 3. First installable Android preview

This is the fastest real-device milestone and does not require Google Play membership:

```bash
npm run check
npm run build:preview:android
```

The `preview` profile produces an internally distributed Android APK. Install it from the EAS build page and test on at least one small phone and one modern large phone.

### 4. iOS device or simulator preview

For an iOS Simulator build:

```bash
npx eas-cli@latest build --profile development-simulator --platform ios
```

For a physical iPhone development/preview build, an active Apple Developer Program account and device signing are required:

```bash
npm run build:preview:ios
```

### 5. Internal beta acceptance gate

Do not submit to stores until the preview build passes:

- Complete all five challenges
- Verify incorrect-answer retry and next-challenge reset
- Restart the app and document current progress behavior
- Test with airplane mode enabled
- Test keyboard behavior on iOS and Android
- Check small-screen clipping and large text settings
- Check VoiceOver/TalkBack labels and focus order
- Confirm no crashes or console errors
- Have at least one networking instructor review every answer and explanation

### 6. Product work before public beta

Strongest remaining product items:

1. Persist mission progress and preferences locally.
2. Add a home screen and mission-complete summary.
3. Expand mathematical/property-based subnet tests.
4. Replace template icons and splash artwork with approved project assets.
5. Add an in-app About/Support/Privacy screen.
6. Define a lightweight feedback path for beta testers.

Analytics, accounts, notifications, and a backend should remain out unless a specific student or operational need justifies them.

### 7. Store preparation

Android:

- Create the app in Google Play Console.
- Complete Data safety and content-rating forms.
- Upload a production `.aab` to Internal testing first.
- Add approved screenshots, descriptions, icon, privacy URL, and support details.

Apple:

- Create the app in App Store Connect.
- Complete App Privacy, age-rating, encryption, and review-information fields.
- Upload a production build to TestFlight first.
- Add approved screenshots, descriptions, icon, privacy URL, and support details.

### 8. Production commands

After internal acceptance and store records exist:

```bash
npm run check
npm run build:production
npm run submit:production
```

EAS should manage signing credentials inside the authenticated project account. Never commit credentials to this repository.

## Build profiles

- `development`: development client for active engineering
- `development-simulator`: iOS Simulator development build
- `preview`: production-like internal build; Android uses an installable APK
- `production`: store build with automatic native build-number increments

## Release definition of done

- Project owner controls all accounts, identifiers, and signing credentials
- Automated checks pass
- Android internal test and iOS TestFlight build pass real-device review
- Curriculum answers are instructor-approved
- Privacy and support links are live
- Store metadata and screenshots are approved
- A rollback/support owner is assigned for launch week
