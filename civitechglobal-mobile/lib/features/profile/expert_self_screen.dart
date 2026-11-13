import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../company/experts_screen.dart' show expertsProvider, expertProvider;
import '../intake/track_screen.dart' show StatusPill;
import 'profile_data.dart';
import 'profile_screen.dart' show isProfileLink;

/// The consultant's own profile as `GET /consult/me/expert` returns it;
/// null before there is one.
typedef OwnExpert = ({
  String slug,
  String fullName,
  String headline,
  String bio,
  List<String> specialities,
  List<String> languages,
  int? yearsExperience,
  String githubUrl,
  String linkedinUrl,
  String websiteUrl,
  String hourlyFee,
  bool acceptsConsultations,
  bool hasPhoto,
  bool published,
  String moderationStatus,
  String? reviewNote,
});

OwnExpert? _ownExpert(Object? d) {
  if (d is! Map) return null;
  String text(Object? v) => v is String ? v : '';
  List<String> strings(Object? v) =>
      v is List ? v.whereType<String>().toList() : const [];
  return (
    slug: text(d['slug']),
    fullName: text(d['fullName']),
    headline: text(d['headline']),
    bio: text(d['bio']),
    specialities: strings(d['specialities']),
    languages: strings(d['languages']),
    yearsExperience: (d['yearsExperience'] as num?)?.toInt(),
    githubUrl: text(d['githubUrl']),
    linkedinUrl: text(d['linkedinUrl']),
    websiteUrl: text(d['websiteUrl']),
    hourlyFee: switch (d['hourlyFee']) {
      final String fee => fee,
      final num fee => '$fee',
      _ => '',
    },
    acceptsConsultations: d['acceptsConsultations'] != false,
    hasPhoto: d['photoUrl'] is String,
    published: d['published'] == true,
    moderationStatus: text(d['moderationStatus']),
    reviewNote: switch (d['reviewNote']) {
      final String note when note.trim().isNotEmpty => note,
      _ => null,
    },
  );
}

final ownExpertProvider = FutureProvider.autoDispose<OwnExpert?>((ref) async {
  final signedIn = ref.watch(
    sessionProvider.select((s) => s.value?.id != null),
  );
  if (!signedIn) return null;
  return ref
      .read(apiClientProvider)
      .get('/consult/me/expert', parse: _ownExpert);
});

/// The owner's own photo, through the sign-in: the public address serves it
/// only once the profile is approved.
final _ownExpertPhotoProvider = FutureProvider.autoDispose<Uint8List?>((
  ref,
) async {
  try {
    final file = await ref
        .read(apiClientProvider)
        .download('/consult/me/expert/photo');
    return file.bytes.isEmpty ? null : Uint8List.fromList(file.bytes);
  } catch (_) {
    return null;
  }
});

/// The consultant's own profile, as the web's ExpertSelfPage: fee, links and
/// what they help with. A first submission waits for staff; once approved,
/// edits go live at once. Staff-opened expert accounts land here with their
/// profile already written.
class ExpertSelfScreen extends ConsumerStatefulWidget {
  const ExpertSelfScreen({super.key});

  @override
  ConsumerState<ExpertSelfScreen> createState() => _ExpertSelfScreenState();
}

class _ExpertSelfScreenState extends ConsumerState<ExpertSelfScreen> {
  final _form = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _headline = TextEditingController();
  final _bio = TextEditingController();
  final _specialities = TextEditingController();
  final _languages = TextEditingController();
  final _years = TextEditingController();
  final _github = TextEditingController();
  final _linkedin = TextEditingController();
  final _website = TextEditingController();
  final _fee = TextEditingController();
  bool _accepts = true;
  PreparedImage? _photo;

  Map<TextEditingController, String> _saved = {};
  bool _seeded = false;
  bool _tried = false;
  bool _busy = false;
  bool _shrinking = false;
  (String, bool)? _message;

  List<TextEditingController> get _fields => [
    _fullName,
    _headline,
    _bio,
    _specialities,
    _languages,
    _years,
    _github,
    _linkedin,
    _website,
    _fee,
  ];

  @override
  void initState() {
    super.initState();
    ref.listenManual(ownExpertProvider, (_, next) {
      if (_seeded || !next.hasValue) return;
      _seeded = true;
      final e = next.value;
      final user = ref.read(sessionProvider).value;
      _seed(
        e == null
            ? {_fullName: user?.fullName ?? ''}
            : {
                _fullName: e.fullName,
                _headline: e.headline,
                _bio: e.bio,
                _specialities: e.specialities.join('، '),
                _languages: e.languages.join('، '),
                _years: e.yearsExperience?.toString() ?? '',
                _github: e.githubUrl,
                _linkedin: e.linkedinUrl,
                _website: e.websiteUrl,
                _fee: groupThousands(e.hourlyFee),
              },
      );
      if (e != null) setState(() => _accepts = e.acceptsConsultations);
    }, fireImmediately: true);
  }

  void _seed(Map<TextEditingController, String> values) {
    for (final MapEntry(:key, :value) in values.entries) {
      key.text = value;
    }
    _saved = {for (final f in _fields) f: f.text};
  }

  @override
  void dispose() {
    for (final c in _fields) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _dirty =>
      _photo != null || _saved.entries.any((e) => e.key.text != e.value);

  List<String> _split(String value) => [
    for (final item in value.split(RegExp('[,،]')))
      if (item.trim().isNotEmpty) item.trim(),
  ];

  Future<void> _pickPhoto() async {
    final s = ref.read(stringsProvider);
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty || !mounted) return;
    setState(() => _shrinking = true);
    try {
      final image = await prepareImage(
        picked.first.xFile.path,
        picked.first.name,
      );
      if (mounted) setState(() => _photo = image);
    } on ImageNotReady catch (e) {
      if (mounted) {
        setState(
          () => _message = (
            e.problem == ImageProblem.tooLarge
                ? s.upload.errors.imageTooLarge
                : s.upload.errors.unreadableImage,
            false,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _shrinking = false);
    }
  }

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    final p = s.plans;
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    if (_accepts &&
        _github.text.trim().isEmpty &&
        _linkedin.text.trim().isEmpty &&
        _website.text.trim().isEmpty) {
      setState(() => _message = (p.linksRequired, false));
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    final years = toLatinDigits(_years.text.trim());
    final payload = {
      'fullName': _fullName.text.trim(),
      'headline': _headline.text.trim(),
      'bio': _bio.text.trim(),
      'specialities': _split(_specialities.text),
      'languages': _split(_languages.text),
      'yearsExperience': years.isEmpty ? null : int.parse(years),
      'githubUrl': _github.text.trim(),
      'linkedinUrl': _linkedin.text.trim(),
      'websiteUrl': _website.text.trim(),
      'hourlyFee': plainDigits(_fee.text),
      'acceptsConsultations': _accepts,
    };
    final photo = _photo;
    try {
      final status = await ref
          .read(apiClientProvider)
          .upload<String>(
            '/consult/me/expert',
            method: 'PUT',
            form: () => FormData.fromMap({
              'payload': jsonEncode(payload),
              if (photo != null)
                'photo': MultipartFile.fromBytes(
                  photo.bytes,
                  filename: photo.name,
                  contentType: DioMediaType('image', 'webp'),
                ),
            }),
            parse: (d) => d is Map ? '${d['moderationStatus']}' : '',
          );
      await ref.read(hapticsProvider).success();
      _seed({});
      _photo = null;
      ref
        ..invalidate(ownExpertProvider)
        ..invalidate(_ownExpertPhotoProvider)
        ..invalidate(expertsProvider)
        ..invalidate(expertProvider);
      setState(
        () => _message = (
          status == 'PENDING_REVIEW' ? p.expertSubmitted : p.expertSaved,
          true,
        ),
      );
    } catch (e) {
      setState(() => _message = (describeError(s, e), false));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final expert = ref.watch(ownExpertProvider);
    final e = expert.value;
    final verified =
        ref.watch(ownVerificationProvider).value?.status == 'APPROVED';
    final live = e != null && e.published && e.moderationStatus == 'APPROVED';
    final storedPhoto = e?.hasPhoto ?? false
        ? ref.watch(_ownExpertPhotoProvider).value
        : null;

    String? required(String? v) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return s.mobile.fieldRules.required;
      return t.length < 2 ? s.mobile.fieldRules.required : null;
    }

    String? link(String? v, String host) {
      final t = (v ?? '').trim();
      return t.isEmpty || isProfileLink(t, host) ? null : s.volunteer.errUrl;
    }

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _busy,
      child: Scaffold(
        appBar: AppBar(
          leading: homeLeading(context),
          title: Text(p.expertTitle),
          actions: [
            if (live)
              IconButton(
                tooltip: p.viewPublic,
                icon: const Icon(Icons.open_in_new_rounded),
                onPressed: () => context.push('/experts/${e.slug}'),
              ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: !expert.hasValue && !expert.hasError
              ? const Center(child: GirihSpinner())
              : ListView(
                  padding: BaghLayout.readablePadding(
                    context,
                    top: BaghSpace.gutter,
                    bottom: BaghSpace.section * 2,
                  ),
                  children: [
                    Text(
                      p.expertIntro,
                      style: text.bodyLarge?.copyWith(color: c.ink2),
                    ),
                    const SizedBox(height: 12),
                    if (expert.hasError)
                      FormMessage(describeError(s, expert.error!)),
                    if (e != null)
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          StatusPill(
                            p.expertStatuses.label(e.moderationStatus),
                            tone: switch (e.moderationStatus) {
                              'APPROVED' => 0,
                              'REJECTED' => 3,
                              _ => 1,
                            },
                          ),
                          if (e.reviewNote case final note?)
                            Text(
                              '${p.reviewNote}: $note',
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                        ],
                      )
                    else if (!verified)
                      SoftSurface(
                        tint: c.tints[1],
                        radius: BaghRadius.tile,
                        padding: const EdgeInsets.all(14),
                        onTap: () => context.push('/dashboard/verification'),
                        child: Text(
                          p.expertVerifyFirst,
                          style: text.bodyMedium?.copyWith(
                            color: c.tints[1].ink,
                          ),
                        ),
                      ),
                    const SizedBox(height: BaghSpace.gutter),
                    SoftSurface(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _form,
                        autovalidateMode: _tried
                            ? AutovalidateMode.always
                            : AutovalidateMode.disabled,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 14,
                          children: [
                            Row(
                              spacing: 14,
                              children: [
                                CircleAvatar(
                                  radius: 32,
                                  backgroundColor: c.primarySoft.fill,
                                  backgroundImage: switch ((
                                    _photo,
                                    storedPhoto,
                                  )) {
                                    (final picked?, _) => MemoryImage(
                                      picked.bytes,
                                    ),
                                    (_, final stored?) => MemoryImage(stored),
                                    _ => null,
                                  },
                                  child: _photo == null && storedPhoto == null
                                      ? Icon(
                                          Icons.person_outline_rounded,
                                          color: c.primarySoft.ink,
                                        )
                                      : null,
                                ),
                                Expanded(
                                  child: BaghKey(
                                    label: p.expertPhoto,
                                    icon: Icons.photo_camera_outlined,
                                    kind: BaghKeyKind.outline,
                                    loading: _shrinking,
                                    onPressed: _pickPhoto,
                                  ),
                                ),
                              ],
                            ),
                            TextFormField(
                              controller: _fullName,
                              maxLength: 120,
                              decoration: InputDecoration(
                                labelText: s.join.fullName,
                                counterText: '',
                              ),
                              validator: required,
                            ),
                            TextFormField(
                              controller: _headline,
                              maxLength: 160,
                              decoration: InputDecoration(
                                labelText: p.expertHeadline,
                                counterText: '',
                              ),
                              validator: required,
                            ),
                            TextFormField(
                              controller: _bio,
                              maxLength: 4000,
                              minLines: 4,
                              maxLines: 10,
                              keyboardType: TextInputType.multiline,
                              decoration: InputDecoration(
                                labelText: p.expertBio,
                                alignLabelWithHint: true,
                                counterText: '',
                              ),
                            ),
                            TextFormField(
                              controller: _specialities,
                              decoration: InputDecoration(
                                labelText: p.expertSpecialities,
                              ),
                            ),
                            TextFormField(
                              controller: _languages,
                              decoration: InputDecoration(
                                labelText: p.expertLanguages,
                              ),
                            ),
                            TextFormField(
                              controller: _years,
                              keyboardType: TextInputType.number,
                              textDirection: TextDirection.ltr,
                              maxLength: 2,
                              decoration: InputDecoration(
                                labelText: p.expertYears,
                                counterText: '',
                              ),
                              validator: (v) =>
                                  RegExp(
                                    r'^\d{0,2}$',
                                  ).hasMatch(toLatinDigits((v ?? '').trim()))
                                  ? null
                                  : s.mobile.fieldRules.required,
                            ),
                            SwitchListTile.adaptive(
                              contentPadding: EdgeInsets.zero,
                              value: _accepts,
                              onChanged: (v) => setState(() => _accepts = v),
                              title: Text(p.acceptsConsultations),
                            ),
                            TextFormField(
                              controller: _fee,
                              keyboardType: TextInputType.number,
                              textDirection: TextDirection.ltr,
                              inputFormatters: const [ThousandsFormatter()],
                              decoration: InputDecoration(
                                labelText: p.hourlyFee,
                                helperText: p.hourlyFeeHint,
                                helperMaxLines: 2,
                              ),
                            ),
                            Text(p.linksTitle, style: text.titleSmall),
                            Text(
                              p.linksHint,
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                            TextFormField(
                              controller: _github,
                              keyboardType: TextInputType.url,
                              textDirection: TextDirection.ltr,
                              autocorrect: false,
                              decoration: InputDecoration(
                                labelText: p.github,
                                hintText: 'https://github.com/…',
                              ),
                              validator: (v) => link(v, 'github.com'),
                            ),
                            TextFormField(
                              controller: _linkedin,
                              keyboardType: TextInputType.url,
                              textDirection: TextDirection.ltr,
                              autocorrect: false,
                              decoration: InputDecoration(
                                labelText: p.linkedin,
                                hintText: 'https://www.linkedin.com/in/…',
                              ),
                              validator: (v) => link(v, 'linkedin.com'),
                            ),
                            TextFormField(
                              controller: _website,
                              keyboardType: TextInputType.url,
                              textDirection: TextDirection.ltr,
                              autocorrect: false,
                              decoration: InputDecoration(
                                labelText: p.website,
                                hintText: 'https://',
                              ),
                              validator: (v) {
                                final t = (v ?? '').trim();
                                final uri = Uri.tryParse(t);
                                return t.isEmpty ||
                                        (uri != null &&
                                            uri.hasScheme &&
                                            uri.host.contains('.'))
                                    ? null
                                    : s.volunteer.errUrl;
                              },
                            ),
                            if (_message case (final msg, final ok))
                              FormMessage(msg, positive: ok),
                            BaghKey(
                              label:
                                  e == null || e.moderationStatus == 'REJECTED'
                                  ? p.submitExpert
                                  : p.saveExpert,
                              icon: Icons.check_rounded,
                              loading: _busy,
                              expand: true,
                              onPressed: _save,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
