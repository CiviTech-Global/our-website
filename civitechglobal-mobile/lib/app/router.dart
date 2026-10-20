import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/auth/session.dart';
import '../core/config.dart';
import '../core/links.dart';
import '../core/settings.dart';
import '../core/telemetry.dart';
import '../features/account/login_screen.dart';
import '../features/account/mfa_screen.dart';
import '../features/account/recovery_screens.dart';
import '../features/account/register_screen.dart';
import '../features/account/security_screen.dart';
import '../features/blog/blog.dart';
import '../features/company/about_screen.dart';
import '../features/company/experts_screen.dart';
import '../features/company/services_screen.dart';
import '../features/company/showcase.dart';
import '../features/company/team_screen.dart';
import '../features/contact/contact_screen.dart';
import '../features/explore/explore_screen.dart';
import '../features/help/help_centre_screen.dart';
import '../features/home/home_screen.dart';
import '../features/inbox/inbox_screen.dart';
import '../features/inbox/thread_screen.dart';
import '../features/insurance/apply_screen.dart';
import '../features/insurance/insurance_screen.dart';
import '../features/insurance/product_screen.dart';
import '../features/insurance/third_party_screen.dart';
import '../features/intake/consult_screen.dart';
import '../features/intake/resume_screen.dart';
import '../features/intake/start_project_screen.dart';
import '../features/intake/track_screen.dart';
import '../features/me/me_screen.dart';
import '../features/me/requests_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/public_profile_screen.dart';
import '../features/profile/verification_screen.dart';
import '../features/settings/language_choice_screen.dart';
import '../features/settings/settings_screen.dart';
import '../l10n/l10n.dart';
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
    // A website link the app has no screen for opens that page in a browser
    // tab over the app. Not the outside browser: Android could hand a link
    // to this site straight back to the app.
    onException: (context, state, router) {
      launchUrl(
        AppConfig.website(
          state.uri.toString(),
          ref.read(l10nProvider).language,
        ),
        mode: LaunchMode.inAppBrowserView,
      );
      if (router.routerDelegate.currentConfiguration.isEmpty) router.go('/');
    },
    refreshListenable: refresh,
    redirect: (context, state) {
      final path = state.uri.path;
      // A website link carries its language as a prefix (/en/blog/...); the
      // app shows the same screen in the language it is already set to.
      if (stripLocalePrefix(path) case final bare when bare != path) {
        return state.uri.replace(path: bare).toString();
      }
      // The proposal document lives on the tracking screen in the app.
      if (path.startsWith('/proposal/') && !path.contains('/preview/')) {
        return Uri(
          path: '/track',
          queryParameters: {'code': path.substring('/proposal/'.length)},
        ).toString();
      }
      // The web's member inbox is the Inbox tab here. A message notice
      // written before the thread's kind was in its link
      // (/dashboard/messages/<id>) opens the list.
      if (path == '/dashboard/messages' ||
          RegExp(r'^/dashboard/messages/[^/]+$').hasMatch(path)) {
        return '/inbox';
      }
      if (path == '/dashboard/notifications') {
        return '/inbox?tab=notifications';
      }
      // The member home is the Me tab.
      if (path == '/dashboard') return '/me';
      // First run: the language comes before anything else.
      if (ref.read(settingsProvider).language == null) {
        return path == '/welcome' ? null : '/welcome';
      }
      if (path == '/welcome') return '/';

      // Screens that need an account send a signed-out visitor to sign in
      // and back again afterwards.
      final session = ref.read(sessionProvider);
      const private = ['/me/security', '/dashboard'];
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
              GoRoute(
                path: '/inbox',
                builder: (_, state) =>
                    InboxScreen(tab: state.uri.queryParameters['tab']),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/me', builder: (_, _) => const MeScreen())],
          ),
        ],
      ),
      GoRoute(path: '/me/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(
        path: '/dashboard/requests',
        builder: (_, _) => const RequestsScreen(),
      ),
      GoRoute(
        path: '/dashboard/profile',
        builder: (_, _) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/dashboard/verification',
        builder: (_, _) => const VerificationScreen(),
      ),
      // Public: anyone may read a member's profile.
      GoRoute(
        path: '/profiles/:username',
        builder: (_, state) =>
            PublicProfileScreen(username: state.pathParameters['username']!),
      ),
      GoRoute(
        path: '/dashboard/messages/:kind/:threadId',
        builder: (_, state) => ThreadScreen(
          kind: state.pathParameters['kind']!,
          threadId: state.pathParameters['threadId']!,
        ),
      ),
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
      // The company and its content, at the website's own paths.
      GoRoute(path: '/services', builder: (_, _) => const ServicesScreen()),
      GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
      GoRoute(path: '/team', builder: (_, _) => const TeamScreen()),
      GoRoute(path: '/portfolio', builder: (_, _) => const PortfolioScreen()),
      GoRoute(
        path: '/customers',
        builder: (_, _) => const OrganizationsScreen(customers: true),
      ),
      GoRoute(
        path: '/partners',
        builder: (_, _) => const OrganizationsScreen(customers: false),
      ),
      GoRoute(
        path: '/blog',
        builder: (_, _) => const BlogIndexScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (_, state) => BlogPostScreen(
              slug: state.pathParameters['slug']!,
              locale: state.uri.queryParameters['lang'],
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/insurance',
        builder: (_, _) => const InsuranceScreen(),
        routes: [
          // Before ':slug', which would otherwise take it as a product.
          GoRoute(
            path: 'third-party',
            builder: (_, _) => const ThirdPartyScreen(),
          ),
          GoRoute(
            path: ':slug',
            builder: (_, state) =>
                InsuranceProductScreen(slug: state.pathParameters['slug']!),
            routes: [
              GoRoute(
                path: 'apply',
                builder: (_, state) => InsuranceApplyScreen(
                  slug: state.pathParameters['slug']!,
                  initialStep:
                      int.tryParse(state.uri.queryParameters['step'] ?? '') ??
                      0,
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/experts',
        builder: (_, _) => const ExpertsScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (_, state) =>
                ExpertScreen(slug: state.pathParameters['slug']!),
          ),
        ],
      ),
      GoRoute(
        path: '/help',
        builder: (_, _) => const HelpCentreScreen(),
        routes: [
          // A guide's own address opens the centre with that guide on top.
          GoRoute(
            path: ':id',
            builder: (_, state) =>
                HelpCentreScreen(guide: state.pathParameters['id']),
          ),
        ],
      ),
      GoRoute(path: '/contact', builder: (_, _) => const ContactScreen()),
      // Client intake.
      GoRoute(
        path: '/start-project',
        builder: (_, state) => StartProjectScreen(
          initialStep:
              int.tryParse(state.uri.queryParameters['step'] ?? '') ?? 0,
        ),
      ),
      GoRoute(
        path: '/consult',
        builder: (_, state) =>
            ConsultScreen(expertSlug: state.uri.queryParameters['expert']),
      ),
      GoRoute(path: '/join', builder: (_, _) => const ResumeScreen()),
      GoRoute(
        path: '/volunteer',
        builder: (_, _) => const ResumeScreen(programme: true),
      ),
      GoRoute(
        path: '/track',
        builder: (_, state) =>
            TrackScreen(code: state.uri.queryParameters['code']),
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
