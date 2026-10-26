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

## Performance

Scrolling is measured on a real phone in profile mode with `flutter_driver`
(`integration_test` needs androidx test libraries from Google's Maven, which
the build machine cannot reach):

```sh
flutter drive --profile --target=test_driver/perf.dart \
  --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

It opens the book board, the market listings, the project board and the job
board by their website links, flings each up and down, and writes
`build/<screen>.timeline_summary.json`. `flutter drive` takes the build number
from `pubspec.yaml`, so raise it above the installed one for the run (Android
refuses a downgrade) and put it back afterwards.

Baseline, 26 October 2026, Galaxy S21 FE at 120 Hz: average frame build
1.6–2.0 ms and raster 3.0–4.2 ms; no frame over 16.7 ms on any of the four
screens; frames over 8.3 ms 2–4% on the picture boards and 9–11% on the text
boards. Run it again on a low-end phone before a release.

## Releasing

The app is ready to ship once the server it talks to has the mobile changes.
In order:

1. **Deploy the server and web** (production is still on `e400753`). The app
   needs the mobile token transport, the capabilities `mobile` block and the
   API fixes made alongside the app; the web carries the `/app` download
   page. `assetlinks.json` (for website links opening in the app) ships with
   the web.
2. **Build the release** with the upload key (`android/key.properties`):

   ```sh
   flutter build apk --release --split-per-abi --obfuscate \
     --split-debug-info=build/symbols --build-number=<next>
   ```

   Keep `build/symbols` for reading crash reports. Raise the build number
   above every one installed or uploaded before. Add
   `--target-platform android-arm,android-arm64` to skip the x86_64 APK,
   which only emulators use. Native libraries are packed compressed
   (`useLegacyPackaging` in `android/app/build.gradle.kts`), so each APK is
   about 11 MB rather than 25 MB.
3. **Publish the APKs on the website**: copy `app-arm64-v8a-release.apk` and
   `app-armeabi-v7a-release.apk` to the web host (for example
   `/downloads/rayan-<version>-arm64.apk`) and set `MOBILE_APK_ARM64_URL` and
   `MOBILE_APK_ARMV7_URL` on the API. The `/app` page shows them at once.
4. **Stores**: list the app on Cafe Bazaar and Myket (developer accounts,
   listing text, screenshots, the privacy page), then set
   `MOBILE_BAZAAR_URL` and `MOBILE_MYKET_URL`. The update screen opens
   Cafe Bazaar once its link is set, the website's `/app` page until then.
5. **Versions**: set `MOBILE_LATEST_VERSION` to the new version to suggest an
   update to older installs, and `MOBILE_MIN_VERSION` only when an old build
   can no longer work against the API.
