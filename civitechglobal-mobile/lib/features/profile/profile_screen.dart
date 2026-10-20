import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/local_counter.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'profile_data.dart';
import 'verification_screen.dart' show verificationTone;

final _url = RegExp(r'^https?://\S+\.\S+', caseSensitive: false);

/// The account's profile, as the web's dashboard ProfilePage: the name and
/// phone the company knows the member by, then the public profile the
/// market sees (kept apart: those are who the person is to us, these are
/// who they choose to be to strangers), and the way to verification and
/// security. Each part saves on its own.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _accountForm = GlobalKey<FormState>();
  final _publicForm = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _headline = TextEditingController();
  final _bio = TextEditingController();
  final _website = TextEditingController();
  final _skills = TextEditingController();

  /// What each field held when last seeded or saved, to tell an edit from
  /// the value as it came.
  Map<TextEditingController, String> _saved = {};
  bool _seededAccount = false;
  bool _seededPublic = false;

  /// After a first save attempt, fields re-check as they change.
  bool _triedAccount = false;
  bool _triedPublic = false;
  bool _savingAccount = false;
  bool _savingPublic = false;
  (String, bool)? _accountMessage;
  (String, bool)? _publicMessage;

  @override
  void initState() {
    super.initState();
    // Seeded once, when each answer first arrives: a later refresh must not
    // overwrite what is being typed.
    ref
      ..listenManual(sessionProvider, (_, next) {
        final user = next.value;
        if (_seededAccount || user == null) return;
        _seededAccount = true;
        _seed({
          _firstName: user.firstName,
          _lastName: user.lastName,
          _phone: user.phone ?? '',
        });
      }, fireImmediately: true)
      ..listenManual(ownProfileProvider, (_, next) {
        final profile = next.value;
        if (_seededPublic || profile == null) return;
        _seededPublic = true;
        _seed({
          _headline: profile.headline ?? '',
          _bio: profile.bio ?? '',
          _website: profile.website ?? '',
          _skills: profile.skills.join('، '),
        });
      }, fireImmediately: true);
  }

  void _seed(Map<TextEditingController, String> values) {
    for (final MapEntry(:key, :value) in values.entries) {
      key.text = value;
    }
    _saved = {..._saved, ...values};
  }

  @override
  void dispose() {
    for (final c in [
      _firstName,
      _lastName,
      _phone,
      _headline,
      _bio,
      _website,
      _skills,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _dirty => _saved.entries.any((e) => e.key.text != e.value);

  Future<void> _saveAccount() async {
    final s = ref.read(stringsProvider);
    if (!_triedAccount) setState(() => _triedAccount = true);
    if (!_accountForm.currentState!.validate() || _savingAccount) return;
    setState(() {
      _savingAccount = true;
      _accountMessage = null;
    });
    try {
      final user = await ref
          .read(sessionProvider.notifier)
          .updateProfile(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            phone: toLatinDigits(_phone.text.trim()),
          );
      await ref.read(hapticsProvider).success();
      _seed({
        _firstName: user.firstName,
        _lastName: user.lastName,
        _phone: user.phone ?? '',
      });
      setState(() => _accountMessage = (s.dashboard.profileSaved, true));
    } catch (e) {
      setState(
        () => _accountMessage = (
          describeError(s, e, fallback: s.errors.endpointUnavailable),
          false,
        ),
      );
    } finally {
      if (mounted) setState(() => _savingAccount = false);
    }
  }

  Future<void> _savePublic({required bool withSkills}) async {
    final s = ref.read(stringsProvider);
    if (!_triedPublic) setState(() => _triedPublic = true);
    if (!_publicForm.currentState!.validate() || _savingPublic) return;
    setState(() {
      _savingPublic = true;
      _publicMessage = null;
    });
    try {
      await ref
          .read(profileActionsProvider)
          .savePublicProfile(
            headline: _headline.text.trim(),
            bio: _bio.text.trim(),
            website: _website.text.trim(),
            skills: withSkills ? splitSkills(_skills.text) : null,
          );
      await ref.read(hapticsProvider).success();
      _seed({
        _headline: _headline.text,
        _bio: _bio.text,
        _website: _website.text,
        _skills: _skills.text,
      });
      setState(() => _publicMessage = (s.market.publicProfileSaved, true));
    } catch (e) {
      setState(() => _publicMessage = (describeError(s, e), false));
    } finally {
      if (mounted) setState(() => _savingPublic = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final user = ref.watch(sessionProvider).value;
    final profile = ref.watch(ownProfileProvider);
    final verification = ref.watch(ownVerificationProvider).value;
    final jobsV2 =
        ref.watch(capabilitiesProvider).value?.feature('jobsV2') ?? false;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final username = profile.value?.username;
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _savingAccount || _savingPublic,
      child: Scaffold(
        appBar: AppBar(
          leading: homeLeading(context),
          title: Text(s.dashboard.profile),
          actions: const [HelpAction('profile')],
        ),
        body: SafeArea(
          top: false,
          child: user == null
              ? const Center(child: GirihSpinner())
              : RefreshIndicator(
                  color: c.primary,
                  onRefresh: () async {
                    ref
                      ..invalidate(ownProfileProvider)
                      ..invalidate(ownVerificationProvider);
                    await ref.read(ownProfileProvider.future);
                  },
                  child: ListView(
                    padding: BaghLayout.readablePadding(
                      context,
                      top: BaghSpace.gutter,
                      bottom: BaghSpace.section * 2,
                    ),
                    children: [
                      Text(
                        s.app.memberDescriptions.profile,
                        style: text.bodyLarge?.copyWith(color: c.ink2),
                      ),
                      const SizedBox(height: BaghSpace.gutter),
                      _Section(
                        title: s.dashboard.profileEditTitle,
                        subtitle: user.email,
                        ltrSubtitle: true,
                        child: Form(
                          key: _accountForm,
                          autovalidateMode: _triedAccount
                              ? AutovalidateMode.always
                              : AutovalidateMode.disabled,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            spacing: 14,
                            children: [
                              TextFormField(
                                controller: _firstName,
                                autofillHints: const [AutofillHints.givenName],
                                decoration: InputDecoration(
                                  labelText: s.auth.firstName,
                                ),
                                validator: (v) => _name(s, v),
                              ),
                              TextFormField(
                                controller: _lastName,
                                autofillHints: const [AutofillHints.familyName],
                                decoration: InputDecoration(
                                  labelText: s.auth.lastName,
                                ),
                                validator: (v) => _name(s, v),
                              ),
                              TextFormField(
                                controller: _phone,
                                keyboardType: TextInputType.phone,
                                textDirection: TextDirection.ltr,
                                autofillHints: const [
                                  AutofillHints.telephoneNumber,
                                ],
                                decoration: InputDecoration(
                                  labelText: s.dashboard.phone,
                                  hintText: '09121234567',
                                ),
                                validator: (v) {
                                  final t = toLatinDigits(v ?? '').trim();
                                  if (t.isEmpty) return null;
                                  final digits = t.replaceAll(
                                    RegExp(r'\D'),
                                    '',
                                  );
                                  return t.length <= 20 &&
                                          digits.length >= 8 &&
                                          RegExp(r'^\+?[\d\s()-]+$').hasMatch(t)
                                      ? null
                                      : s.join.errPhone;
                                },
                              ),
                              if (_accountMessage case (final msg, final ok))
                                FormMessage(msg, positive: ok),
                              BaghKey(
                                label: s.common.save,
                                icon: Icons.check_rounded,
                                loading: _savingAccount,
                                expand: true,
                                onPressed: _saveAccount,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: BaghSpace.gutter),
                      _Section(
                        title: m.publicProfileTitle,
                        subtitle: m.publicProfileHint,
                        trailing: username == null
                            ? null
                            : TextButton.icon(
                                onPressed: () =>
                                    context.push('/profiles/$username'),
                                icon: const Icon(
                                  Icons.person_search_outlined,
                                  size: 18,
                                ),
                                label: Text(m.viewProfile),
                              ),
                        child: profile.hasError && !profile.hasValue
                            ? FormMessage(describeError(s, profile.error!))
                            : !profile.hasValue
                            ? const Center(child: GirihSpinner())
                            : Form(
                                key: _publicForm,
                                autovalidateMode: _triedPublic
                                    ? AutovalidateMode.always
                                    : AutovalidateMode.disabled,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  spacing: 14,
                                  children: [
                                    if (username == null)
                                      SoftSurface(
                                        tint: c.tints[2],
                                        radius: BaghRadius.tile,
                                        padding: const EdgeInsets.all(14),
                                        child: Text(
                                          m.usernameMissingHint,
                                          style: text.bodyMedium?.copyWith(
                                            color: c.tints[2].ink,
                                          ),
                                        ),
                                      )
                                    else
                                      Align(
                                        alignment:
                                            AlignmentDirectional.centerStart,
                                        child: Text(
                                          '@$username',
                                          textDirection: TextDirection.ltr,
                                          style: text.titleSmall?.copyWith(
                                            color: c.primary,
                                          ),
                                        ),
                                      ),
                                    TextFormField(
                                      controller: _headline,
                                      maxLength: 120,
                                      buildCounter: localCounter(language),
                                      decoration: InputDecoration(
                                        labelText: m.headlineLabel,
                                        hintText: m.headlinePlaceholder,
                                      ),
                                    ),
                                    TextFormField(
                                      controller: _bio,
                                      maxLength: 1000,
                                      buildCounter: localCounter(language),
                                      minLines: 4,
                                      maxLines: 8,
                                      keyboardType: TextInputType.multiline,
                                      decoration: InputDecoration(
                                        labelText: m.bioLabel,
                                        alignLabelWithHint: true,
                                      ),
                                    ),
                                    TextFormField(
                                      controller: _website,
                                      keyboardType: TextInputType.url,
                                      textDirection: TextDirection.ltr,
                                      autofillHints: const [AutofillHints.url],
                                      decoration: InputDecoration(
                                        labelText: m.websiteLabel,
                                        hintText: m.websitePlaceholder,
                                      ),
                                      validator: (v) {
                                        final t = (v ?? '').trim();
                                        return t.isEmpty || _url.hasMatch(t)
                                            ? null
                                            : s.volunteer.errUrl;
                                      },
                                    ),
                                    // Only where the job board is on, as on
                                    // the web: skills match people to roles.
                                    if (jobsV2)
                                      TextFormField(
                                        controller: _skills,
                                        decoration: InputDecoration(
                                          labelText: s.jobs.skillsLabel,
                                          helperText: s.jobs.skillsHint,
                                          helperMaxLines: 3,
                                          hintText: 'React, Node.js, SQL',
                                        ),
                                        validator: (v) =>
                                            splitSkills(
                                              v ?? '',
                                            ).any((x) => x.length > 40)
                                            ? s.mobile.fieldRules.maxChars
                                                  .fill({
                                                    'n': localDigits(
                                                      40,
                                                      ref
                                                          .read(l10nProvider)
                                                          .language,
                                                    ),
                                                  })
                                            : null,
                                      ),
                                    if (_publicMessage case (
                                      final msg,
                                      final ok,
                                    ))
                                      FormMessage(msg, positive: ok),
                                    BaghKey(
                                      label: s.common.save,
                                      icon: Icons.check_rounded,
                                      loading: _savingPublic,
                                      expand: true,
                                      onPressed: () =>
                                          _savePublic(withSkills: jobsV2),
                                    ),
                                  ],
                                ),
                              ),
                      ),
                      const SizedBox(height: BaghSpace.gutter),
                      SoftSurface(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Column(
                          children: [
                            ListTile(
                              leading: const Icon(Icons.verified_user_outlined),
                              title: Text(m.verificationTitle),
                              subtitle: verification == null
                                  ? null
                                  : Align(
                                      alignment:
                                          AlignmentDirectional.centerStart,
                                      child: Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: StatusPill(
                                          m.label(verification.status),
                                          tone: verificationTone(
                                            verification.status,
                                          ),
                                        ),
                                      ),
                                    ),
                              trailing: Icon(forward),
                              onTap: () =>
                                  context.push('/dashboard/verification'),
                            ),
                            ListTile(
                              leading: const Icon(Icons.lock_outline_rounded),
                              title: Text(s.dashboard.securityTitle),
                              trailing: Icon(forward),
                              onTap: () => context.push('/me/security'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  String? _name(Strings s, String? v) {
    final t = (v ?? '').trim();
    if (t.isEmpty) return s.mobile.fieldRules.required;
    if (t.length > 100) {
      return s.mobile.fieldRules.maxChars.fill({
        'n': localDigits(100, ref.read(l10nProvider).language),
      });
    }
    return null;
  }
}

/// A titled card, with an optional action beside the title.
class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.child,
    this.subtitle,
    this.ltrSubtitle = false,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final bool ltrSubtitle;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(title, style: text.titleMedium),
              ?trailing,
            ],
          ),
          if (subtitle != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(
                subtitle!,
                textDirection: ltrSubtitle ? TextDirection.ltr : null,
                style: text.bodySmall?.copyWith(color: c.ink2),
              ),
            ),
          child,
        ],
      ),
    );
  }
}
