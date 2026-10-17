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
