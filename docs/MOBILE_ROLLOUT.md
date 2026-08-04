# Mobile delivery strategy

## Current decision

The initial product is a responsive web application. Mobile browser functionality comes first, while tablet and desktop browsers retain the complete learning and progress experience.

Apple App Store and Google Play builds are deferred unless learner demand or a browser limitation justifies them.

## Mobile-web acceptance gate

Every release must verify:

- 390px narrow viewport without horizontal overflow
- Touch targets at least 44px high where practical
- Four-octet inputs remain visible and non-overlapping
- Numeric keyboard hints are present
- Typed values remain legible in iPhone WebKit
- Keyboard opening does not hide the active answer workflow
- Wrong/correct feedback is announced appropriately
- Scroll position resets on new questions, replay, and route changes
- Journey completion survives reload in the same browser
- Storage scope is disclosed without implying cross-device sync
- Desktop widths remain readable rather than stretching content edge-to-edge

Desktop responsive emulation is supporting evidence. Physical iPhone Safari/Chrome testing is required before claiming iPhone WebKit acceptance.

## Web release workflow

```bash
npm ci
npm run check
npm run export:web
```

Serve the exact artifact at the production `/subnet` prefix, verify it at 390px, 768px, and 1440px, record its manifest, obtain independent review, then deploy the byte-identical artifact to GitHub Pages.

## Deferred native infrastructure

The repository still contains:

- Expo iOS/Android configuration
- Native SQLite progress adapter
- SecureStore session adapter
- EAS profiles and native build scripts

These are dormant future options, not current supported release targets. Do not spend current scope on app-store identifiers, signing, TestFlight, Play Console, or native physical-device acceptance.

## Conditions that could justify native apps

Revisit native packaging only if evidence shows a concrete need such as:

- Browser keyboard or offline limitations materially harm learning
- Learners request installable app behavior at meaningful volume
- Notifications provide a clearly ethical student benefit
- App-store discovery becomes strategically valuable
- Required device capabilities cannot be delivered reliably on the web

Native development should solve a demonstrated problem, not duplicate the web product by default.
