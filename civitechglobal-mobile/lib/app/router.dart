import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/session.dart';
import '../core/settings.dart';
import '../core/telemetry.dart';
import '../features/account/login_screen.dart';
import '../features/account/mfa_screen.dart';
import '../features/account/recovery_screens.dart';
import '../features/account/register_screen.dart';
import '../features/account/security_screen.dart';
import '../features/explore/explore_screen.dart';
import '../features/home/home_screen.dart';
import '../features/inbox/inbox_screen.dart';
import '../features/me/me_screen.dart';
import '../features/settings/language_choice_screen.dart';
import '../features/settings/settings_screen.dart';
import 'shell.dart';

/// Paths follow the website's wherever a screen exists on both
/// (/login, /register, /forgot-password, /reset-password, /verify-email), so a
/// link from an email or the site lands on the same screen in the app.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref
    ..listen(sessionProvider, (_, _) => refresh.value++)
    ..listen(
      settingsProvider.select((s) => s.language),
      (_, _) => refresh.value++,
    )
    ..onDispose(refresh.dispose);

  final router = GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final path = state.uri.path;
      // First run: the language comes before anything else.
      if (ref.read(settingsProvider).language == null) {
        return path == '/welcome' ? null : '/welcome';
      }
      if (path == '/welcome') return '/';

      // Screens that need an account send a signed-out visitor to sign in
      // and back again afterwards.
      final session = ref.read(sessionProvider);
      const private = ['/me/security'];
      if (!session.isLoading &&
          session.value == null &&
          private.any(path.startsWith)) {
        return Uri(path: '/login', queryParameters: {'from': path}).toString();
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/welcome',
        builder: (_, _) => const LanguageChoiceScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                builder: (_, _) => const ExploreScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/inbox', builder: (_, _) => const InboxScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/me', builder: (_, _) => const MeScreen())],
          ),
        ],
      ),
      GoRoute(path: '/me/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(
        path: '/me/security',
        builder: (_, _) => const SecurityScreen(),
        routes: [
          GoRoute(
            path: 'two-factor',
            builder: (_, _) => const TwoFactorSetupScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (_, state) =>
            LoginScreen(from: state.uri.queryParameters['from']),
        routes: [
          GoRoute(
            path: 'mfa',
            builder: (_, state) {
              final extra =
                  state.extra as ({String challengeToken, String? from})?;
              // A challenge lives only in memory; without one there is
              // nothing to answer, so start the sign-in again.
              if (extra == null) return const LoginScreen();
              return MfaScreen(
                challengeToken: extra.challengeToken,
                from: extra.from,
              );
            },
          ),
        ],
      ),
      GoRoute(
        path: '/register',
        builder: (_, state) =>
            RegisterScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (_, _) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) =>
            ResetPasswordScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (_, state) =>
            VerifyEmailScreen(token: state.uri.queryParameters['token']),
      ),
    ],
  );

  // Crash reports say which screen they came from, never with its query
  // string: those carry reset and verification tokens.
  router.routerDelegate.addListener(() {
    Telemetry.route = router.routerDelegate.currentConfiguration.uri.path;
  });
  if (kDebugMode) GoRouter.optionURLReflectsImperativeAPIs = true;
  return router;
});
