# CiviTech Global — mobile

The Flutter app for Android and iOS. It talks to the same API as the web
(`civitechglobal-server`, `/api/v1`).

- Application ID / bundle ID: `ir.rayantamaddonjahangostar.app`. Permanent
  once published; do not change it.
- Flutter 3.38.9 (stable), Dart ^3.10.8.
- Only `android/` and `ios/` are kept. The web app already exists, and the
  desktop platforms are not targets.

## Commands

From the repository root:

```bash
npm run lint:mobile   # dart format check + flutter analyze --fatal-infos
npm run test:mobile   # flutter test
```

Or inside this folder: `flutter pub get`, `flutter run`, `flutter test`.

Against a local server instead of production, in a debug build (the only
kind allowed plain HTTP, and only to these hosts:
`android/app/src/debug/res/xml/network_security_config.xml`):

- a phone on USB: `adb reverse tcp:5000 tcp:5000`, then
  `flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1`;
- the emulator: `--dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1`
  (10.0.2.2 is the host machine, seen from the emulator).

The development demo data (`npm run demo:seed` in civitechglobal-server) has
members with conversations and notifications; every demo account's password
is `demo-password`.

## Layout

```
lib/
  app/        the app root, router (go_router) and the five-tab shell
  core/       API client and session, settings, capabilities, formats, telemetry
  design/     Bagh Ravan: palettes, tokens, theme, springs, haptics, widgets
  l10n/       translations (generated accessors in l10n/generated/)
  features/   one folder per area: account, home, explore, inbox, me, help, ...
```

Design rules, palettes and the phase plan: the plan of record (Bagh Ravan
Mobile Plan artifact). The palettes' contrast is checked by
`test/design/palette_test.dart`; change a colour only with that test green.

## Generated files

All three are committed, so a checkout builds without running anything.

- **Translations and help guides** come from the web's dictionaries, the one
  source of truth. After changing a dictionary or a guide:
  `node civitechglobal-web/scripts/export-mobile-l10n.mjs`. CI fails when the
  export is stale. App-only text lives in the `mobile` section of the web
  dictionaries, in all six languages.
- **Models** (`*.freezed.dart`, `*.g.dart`):
  `dart run build_runner build --delete-conflicting-outputs --force-jit`.
  `--force-jit` is needed while a dependency ships build hooks, which the
  ahead-of-time build script cannot compile.
- **Icons and splash screen** come from `assets/brand/logo.svg`, the vector
  trace of the company logo: `node civitechglobal-mobile/tool/brand_assets.mjs`
  (needs `npm ci` in civitechglobal-web for its headless browser).

## Package mirror

`pubspec.lock` is resolved against `https://pub.flutter-io.cn`, the mirror
used from Iran (`PUB_HOSTED_URL` and `FLUTTER_STORAGE_BASE_URL` set to the
`flutter-io.cn` hosts). CI resolves against the same host with
`--enforce-lockfile`. Every lockfile entry carries a sha256, so the mirror
cannot swap a package unnoticed. Set the same variables on any new machine,
or `pub get` will rewrite the lockfile's URLs.

## Signing (Android)

Release builds read `android/key.properties`:

```properties
storeFile=/absolute/path/to/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

That file and every `*.jks` / `*.keystore` are gitignored. Keep them, and
their backup, outside the repository. Without the file a release build falls
back to the debug key. That is fine for `flutter run --release` but cannot
be uploaded to a store.

## Website links (Android App Links)

`AndroidManifest.xml` claims the website paths the app has a screen for,
unprefixed (Persian) and under `/en`, `/tr`, `/de`, `/fr` and `/es`. The
router drops the language prefix, so `/en/blog/x` opens the same article in
the app's own language. `test/core/app_links_test.dart` fails when the
manifest and `appPaths` in `lib/core/links.dart` disagree: add a screen to
both or to neither. Never claim a path the app lacks; a page only the
website has is opened in a browser tab (`inAppBrowserView`), and a claimed
one would bounce back into the app.

Android opens these links without asking only once it has verified the site:
`civitechglobal-web/public/.well-known/assetlinks.json` lists
`ir.rayantamaddonjahangostar.app` with the release key's SHA-256 fingerprint
(`keytool -list -v -keystore upload-keystore.jks`). A debug build is signed
with another key, so its links are not verified. A store that re-signs
uploads uses its own key, and that fingerprint has to be added to the file.
Check a device with `adb shell pm get-app-links ir.rayantamaddonjahangostar.app`.

## Signing in against the API

The browser keeps its refresh token in an httpOnly cookie. The app sends
`X-Client: mobile` on the auth endpoints instead (`/auth/register`, `/login`,
`/mfa/verify`, `/refresh`, `/logout`, `/change-password`):

- Responses carry `refreshToken` in `data`, next to `accessToken`. No cookie is
  set.
- `/auth/refresh` and `/auth/logout` take `{ "refreshToken": "..." }` in the
  body, and ignore any cookie.
- Refresh tokens rotate: store the new one from every refresh response, and
  keep it in secure storage (Keychain / Android Keystore), never in plain
  preferences.
- Every other request uses `Authorization: Bearer <accessToken>`.

## Push notifications

Every in-app notification the server writes is also pushed to the member's
registered phones (`civitechglobal-server/src/services/push`). Until a Pushe
account exists this is wired with placeholders:

- The app has no push SDK yet. `NoPushTokenSource` (`lib/core/push.dart`)
  returns no token, so nothing is registered; the Inbox polls while the app
  is open and catches up on launch, so nothing is missed. Adding Pushe means
  a `PushTokenSource` backed by `pushe_flutter` and nothing else.
- The server's `PUSH_PROVIDER` is `none` (production too; `deploy.yml`
  refuses `pushe` without `vault_pushe_api_token` and `pushe_app_id`).
  The Pushe request format in `PushePushProvider` must be checked against
  Pushe's API reference when the account is set up.
- The app registers the phone at sign-in and on every start, removes it
  before signing out, and the server forgets every phone of an account when
  all its sessions end. A tapped push opens its link in the app.

To try the whole path locally: run the server with `PUSH_PROVIDER=console`,
and build with `--dart-define=PUSH_DEV_TOKEN=<any 8+ characters>`. The
server log then shows `[console push]` with what each notification would
have sent.
