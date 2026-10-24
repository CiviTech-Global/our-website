import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/capabilities.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import 'employer_data.dart';
import 'job_board_screen.dart' show jobBenefits, jobSeniorities;
import 'job_form.dart';
import 'jobs_data.dart';

/// Writing a posting, new or a draft being changed, as the web's MyJobsPage
/// form: one form for both, so the rules about salaries live in one place.
/// Saving keeps it a draft; sending it for review is a separate step on the
/// list.
class JobEditorScreen extends ConsumerWidget {
  const JobEditorScreen({this.jobId, super.key});

  /// The posting to change; null for a new one.
  final String? jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    if (jobId == null) return const _Editor();
    final jobs = ref.watch(ownJobsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(m.editJob),
        actions: const [HelpAction('my-jobs')],
      ),
      body: AsyncView(
        value: jobs,
        onRetry: () => ref.invalidate(ownJobsProvider),
        // Gone, or past the two states an author may change: nothing to edit.
        isEmpty: (list) => !list.any((j) => j.id == jobId && j.editable),
        empty: s.list.noResults,
        data: (list) => _Editor(job: list.firstWhere((j) => j.id == jobId)),
      ),
    );
  }
}

class _Editor extends ConsumerStatefulWidget {
  const _Editor({this.job});

  final OwnJob? job;

  @override
  ConsumerState<_Editor> createState() => _EditorState();
}

class _EditorState extends ConsumerState<_Editor> {
  final _form = GlobalKey<FormState>();
  late final JobDraft _d = widget.job == null
      ? JobDraft()
      : JobDraft.fromJob(widget.job!.raw);

  /// The form as it opened, to tell whether anything changed. Taken in
  /// initState: a lazy field would be read first on Back, after the edits,
  /// and always match, so the guard never asked.
  late final String _saved;

  @override
  void initState() {
    super.initState();
    _saved = _snapshot();
  }

  // After a first attempt, fields re-check as they change.
  bool _tried = false;
  bool _sending = false;
  String? _error;

  /// What the server said about each field on the last save, until changed.
  Map<String, String> _serverErrors = const {};

  bool get _edit => widget.job != null;
  bool get _v2 =>
      ref.read(capabilitiesProvider).value?.feature('jobsV2') ?? false;

  String _snapshot() => jsonEncode(_d.toPayload(edit: true, v2: true));

  void _change(String field, VoidCallback apply) {
    setState(() {
      apply();
      if (_serverErrors.containsKey(field)) {
        _serverErrors = {..._serverErrors}..remove(field);
      }
    });
  }

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (!_tried) setState(() => _tried = true);
    final valid = _form.currentState!.validate();
    if (!valid) {
      revealFirstError(_form);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    final actions = ref.read(employerActionsProvider);
    final payload = _d.toPayload(edit: _edit, v2: _v2);
    try {
      if (widget.job case final job?) {
        await actions.updateJob(job.id, payload);
      } else {
        await actions.createJob(payload);
      }
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_edit ? s.market.draftUpdated : s.market.draftCreated),
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      final fields = e is ApiException
          ? e.fieldErrors
          : const <String, String>{};
      setState(() {
        _serverErrors = fields;
        _error = describeError(s, e);
      });
      if (fields.isNotEmpty) {
        // Shown under their fields once the form checks itself again.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_form.currentState?.validate() == false) {
            revealFirstError(_form);
          }
        });
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final j = s.jobs;
    final rules = s.mobile.fieldRules;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(jobCategoriesProvider).value ?? const [];
    final v2 =
        ref.watch(capabilitiesProvider).value?.feature('jobsV2') ?? false;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final d = _d;
    String n(int v) => localDigits(v, language);

    String? length(String? v, int min, int max) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return rules.required;
      if (t.length < min) return rules.minChars.fill({'n': n(min)});
      if (t.length > max) return rules.maxChars.fill({'n': n(max)});
      return null;
    }

    /// An optional whole number within a range.
    String? within(String? v, int min, int max) {
      final digits = plainDigits(v ?? '');
      if (digits.isEmpty) return null;
      final value = int.tryParse(digits);
      if (value == null) return rules.notNumber;
      if (value < min) return rules.atLeast.fill({'n': n(min)});
      if (value > max) return rules.atMost.fill({'n': n(max)});
      return null;
    }

    final digitsOnly = [
      FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
    ];

    Widget field({
      required String key,
      required String label,
      required String value,
      required ValueChanged<String> onChanged,
      String? Function(String?)? validator,
      String? helper,
      String? hint,
      int lines = 1,
      int? maxLength,
      bool number = false,
      bool money = false,
    }) => TextFormField(
      // Keyed by what it edits: a field whose meaning changes (the region,
      // when the country does) starts afresh instead of keeping old text.
      key: ValueKey(key),
      initialValue: money ? groupThousands(value) : value,
      onChanged: (v) => _change(key, () => onChanged(v)),
      validator: (v) => validator?.call(v) ?? _serverErrors[key],
      minLines: lines,
      maxLines: lines > 1 ? lines + 4 : 1,
      maxLength: maxLength,
      keyboardType: lines > 1
          ? TextInputType.multiline
          : number || money
          ? TextInputType.number
          : null,
      // The direction of what is typed, the web's dir="auto": an English
      // description reads left to right with its full stop at the end.
      textDirection: number || money
          ? TextDirection.ltr
          : textDirectionOf(value, Directionality.of(context)),
      inputFormatters: money
          ? [...digitsOnly, const ThousandsFormatter()]
          : number
          ? digitsOnly
          : null,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
        hintText: hint,
        alignLabelWithHint: lines > 1,
        counterText: '',
      ),
    );

    Widget choice({
      required String key,
      required String label,
      required String? value,
      required List<(String, String)> options,
      required ValueChanged<String?> onChanged,
      String? none,
    }) => DropdownButtonFormField<String>(
      key: ValueKey(key),
      borderRadius: BorderRadius.circular(BaghRadius.field),
      initialValue: value == null || value.isEmpty ? null : value,
      isExpanded: true,
      style: text.bodyLarge,
      decoration: InputDecoration(labelText: label),
      hint: none == null ? null : Text(none),
      validator: (_) => _serverErrors[key],
      items: [
        if (none != null) DropdownMenuItem(value: '', child: Text(none)),
        for (final (v, l) in options)
          DropdownMenuItem(
            value: v,
            child: Text(l, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: (v) => _change(key, () => onChanged(v)),
    );

    /// A choice from a long list, in the searchable sheet the board uses.
    Widget picker({
      required String key,
      required String label,
      required String shown,
      required Future<String?> Function() pick,
      required ValueChanged<String> onPicked,
    }) => FormField<String>(
      key: ValueKey(key),
      validator: (_) => _serverErrors[key],
      builder: (state) => InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.field),
        onTap: () async {
          FocusScope.of(context).unfocus();
          final picked = await pick();
          // Closing the sheet hands focus back to the field that last had
          // it, and its keyboard would open over the choice just made.
          FocusManager.instance.primaryFocus?.unfocus();
          if (picked != null) _change(key, () => onPicked(picked));
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            errorText: state.errorText,
            suffixIcon: const Icon(Icons.arrow_drop_down_rounded),
          ),
          isEmpty: shown.isEmpty,
          child: Text(shown, style: text.bodyLarge),
        ),
      ),
    );

    Widget toggle(String label, bool value, ValueChanged<bool> onChanged) =>
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(label, style: text.bodyMedium),
          value: value,
          onChanged: (v) => setState(() => onChanged(v)),
        );

    final categoryOptions = [
      for (final parent in categories.where((x) => x.parentId == null)) ...[
        (
          parent.id,
          categoryName((name: parent.name, nameEn: parent.nameEn), language),
        ),
        for (final child in categories.where((x) => x.parentId == parent.id))
          (
            child.id,
            '    ${categoryName((name: child.name, nameEn: child.nameEn), language)}',
          ),
      ],
    ];
    final categoryShown =
        [
          for (final cat in categories)
            if (cat.id == d.jobCategoryId)
              categoryName((name: cat.name, nameEn: cat.nameEn), language),
        ].firstOrNull ??
        '';
    final iran = !v2 || d.country == homeCountry;

    final sections = <(String, List<Widget>)>[
      (
        v2 ? j.sectionBasics : m.newJob,
        [
          field(
            key: 'title',
            label: m.title,
            value: d.title,
            maxLength: 160,
            onChanged: (v) => d.title = v,
            validator: (v) => length(v, 5, 160),
          ),
          field(
            key: 'description',
            label: m.description,
            value: d.description,
            lines: 6,
            maxLength: 10000,
            onChanged: (v) => d.description = v,
            validator: (v) => length(v, 50, 10000),
          ),
          choice(
            key: 'employmentType',
            label: m.employmentType,
            value: d.employmentType,
            options: [for (final t in jobEmploymentTypes) (t, m.label(t))],
            onChanged: (v) => d.employmentType = v ?? d.employmentType,
          ),
          choice(
            key: 'workArrangement',
            label: m.workArrangement,
            value: d.workArrangement,
            options: [for (final w in jobWorkArrangements) (w, m.label(w))],
            onChanged: (v) => d.workArrangement = v ?? d.workArrangement,
          ),
          if (v2) ...[
            picker(
              key: 'jobCategoryId',
              label: j.category,
              shown: categoryShown,
              pick: () => pickFromList(
                context,
                title: j.category,
                all: j.chooseCategory,
                searchable: true,
                options: categoryOptions,
              ),
              onPicked: (id) => d.jobCategoryId = id,
            ),
            choice(
              key: 'seniority',
              label: j.seniority,
              value: d.seniority,
              none: '—',
              options: [
                for (final l in jobSeniorities) (l, j.seniorityLevels.label(l)),
              ],
              onChanged: (v) => d.seniority = v ?? '',
            ),
            field(
              key: 'workingHours',
              label: j.workingHours,
              hint: j.workingHoursPlaceholder,
              value: d.workingHours,
              maxLength: 160,
              onChanged: (v) => d.workingHours = v,
            ),
            toggle(j.urgentOnly, d.urgent, (v) => d.urgent = v),
          ],
        ],
      ),
      (
        j.location,
        [
          if (v2)
            picker(
              key: 'country',
              label: j.country,
              shown: geo.country(d.country),
              pick: () => pickFromList(
                context,
                title: j.country,
                all: '—',
                searchable: true,
                options: geo.countryOptions(),
              ),
              // A country must be chosen; the clear row changes nothing.
              onPicked: (code) {
                if (code.isNotEmpty) d.setCountry(code);
              },
            ),
          if (iran)
            picker(
              key: 'province',
              label: m.province,
              shown: d.province.isEmpty
                  ? ''
                  : displayProvince(d.province, language),
              pick: () => pickFromList(
                context,
                title: m.province,
                all: '—',
                searchable: true,
                options: [
                  // A posting written before the list existed keeps what it
                  // said rather than losing it on the next save.
                  if (d.province.isNotEmpty &&
                      !iranProvinces.any((p) => p.fa == d.province))
                    (d.province, d.province),
                  for (final p in iranProvinces)
                    (p.fa, provinceLabel(p, language)),
                ],
              ),
              onPicked: (fa) => d.province = fa,
            )
          else
            field(
              key: 'region-${d.country}',
              label: j.region,
              value: d.province,
              maxLength: 80,
              onChanged: (v) => d.province = v,
            ),
          field(
            key: 'city',
            label: m.city,
            value: d.city,
            maxLength: 80,
            onChanged: (v) => d.city = v,
          ),
          if (v2 && d.workArrangement == 'REMOTE')
            toggle(
              j.remoteWorldwideOption,
              d.remoteWorldwide,
              (v) => d.remoteWorldwide = v,
            ),
          // The free-text tag gives way to the fixed list on the new board.
          if (!v2)
            field(
              key: 'category',
              label: m.category,
              value: d.category,
              maxLength: 80,
              onChanged: (v) => d.category = v,
            ),
        ],
      ),
      (
        m.salary,
        [
          toggle(
            m.salaryUndisclosed,
            d.salaryUndisclosed,
            (v) => d.salaryUndisclosed = v,
          ),
          if (!d.salaryUndisclosed) ...[
            if (v2) ...[
              picker(
                key: 'currency',
                label: j.currencyLabel,
                shown: geo.currency(d.currency, m.currency),
                pick: () => pickFromList(
                  context,
                  title: j.currencyLabel,
                  all: '—',
                  searchable: true,
                  options: [
                    for (final code in currencyCodes)
                      (code, geo.currency(code, m.currency)),
                  ],
                ),
                onPicked: (code) {
                  if (code.isNotEmpty) d.currency = code;
                },
              ),
              choice(
                key: 'salaryPeriod',
                label: j.salaryPeriodLabel,
                value: d.salaryPeriod,
                options: [
                  for (final p in jobSalaryPeriods)
                    (p, j.periodOptions.label(p)),
                ],
                onChanged: (v) => d.salaryPeriod = v ?? d.salaryPeriod,
              ),
            ],
            field(
              key: 'salaryMin',
              label: '${m.salary} (${m.from})',
              value: d.salaryMin,
              money: true,
              onChanged: (v) => d.salaryMin = plainDigits(v),
            ),
            field(
              key: 'salaryMax',
              label: '${m.salary} (${m.to})',
              value: d.salaryMax,
              money: true,
              onChanged: (v) => d.salaryMax = plainDigits(v),
              // A range that runs backwards is a typo.
              validator: (v) {
                final low = int.tryParse(d.salaryMin);
                final high = int.tryParse(plainDigits(v ?? ''));
                return low != null && high != null && high < low
                    ? rules.atLeast.fill({
                        'n': groupedNumber(d.salaryMin, language),
                      })
                    : null;
              },
            ),
          ],
        ],
      ),
      (
        j.openings,
        [
          field(
            key: 'openings',
            label: j.openings,
            helper: j.openingsHint,
            value: d.openings,
            number: true,
            maxLength: 3,
            onChanged: (v) => d.openings = v,
            validator: (v) =>
                plainDigits(v ?? '').isEmpty ? null : within(v, 1, 100),
          ),
          DateField(
            label: m.closesAt,
            value: d.closesAt,
            // Tomorrow at the earliest: a deadline of today has passed by
            // the time a reviewer publishes it.
            firstDate: DateTime.now().add(const Duration(days: 1)),
            errorText: _serverErrors['closesAt'],
            onChanged: (v) => _change('closesAt', () => d.closesAt = v),
          ),
          Text(j.closesAtHint, style: text.bodySmall?.copyWith(color: c.ink2)),
          field(
            key: 'skills',
            label: m.skills,
            hint: 'node, postgres, react',
            value: d.skills,
            onChanged: (v) => d.skills = v,
          ),
        ],
      ),
      if (v2) ...[
        (
          j.sectionRequirements,
          [
            field(
              key: 'minExperienceYears',
              label: j.minExperienceLabel,
              value: d.minExperienceYears,
              number: true,
              maxLength: 2,
              onChanged: (v) => d.minExperienceYears = v,
              validator: (v) => within(v, 0, 40),
            ),
            choice(
              key: 'educationLevel',
              label: j.education,
              value: d.educationLevel,
              none: j.notRequired,
              options: [
                for (final e in jobEducationLevels)
                  (e, j.educationLevels.label(e)),
              ],
              onChanged: (v) => d.educationLevel = v ?? '',
            ),
            field(
              key: 'fieldOfStudy',
              label: j.fieldOfStudy,
              value: d.fieldOfStudy,
              maxLength: 120,
              onChanged: (v) => d.fieldOfStudy = v,
            ),
            choice(
              key: 'genderRequirement',
              label: j.gender,
              value: d.genderRequirement,
              options: [for (final g in jobGenders) (g, j.genders.label(g))],
              onChanged: (v) => d.genderRequirement = v ?? 'ANY',
            ),
            field(
              key: 'ageMin',
              label: j.ageMinLabel,
              value: d.ageMin,
              number: true,
              maxLength: 2,
              onChanged: (v) => d.ageMin = v,
              validator: (v) => within(v, 15, 80),
            ),
            field(
              key: 'ageMax',
              label: j.ageMaxLabel,
              value: d.ageMax,
              number: true,
              maxLength: 2,
              onChanged: (v) => d.ageMax = v,
              validator: (v) {
                final problem = within(v, 15, 80);
                if (problem != null) return problem;
                final low = int.tryParse(plainDigits(d.ageMin));
                final high = int.tryParse(plainDigits(v ?? ''));
                return low != null && high != null && high < low
                    ? rules.atLeast.fill({'n': n(low)})
                    : null;
              },
            ),
            choice(
              key: 'militaryService',
              label: j.militaryService,
              value: d.militaryService,
              options: [
                for (final o in jobMilitaryOptions)
                  (o, j.militaryOptions.label(o)),
              ],
              onChanged: (v) => d.militaryService = v ?? 'ANY',
            ),
          ],
        ),
        (
          j.benefits,
          [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final b in jobBenefits)
                  FilterChip(
                    label: Text(j.benefitLabels.label(b)),
                    selected: d.benefits.contains(b),
                    onSelected: (on) => setState(
                      () => on ? d.benefits.add(b) : d.benefits.remove(b),
                    ),
                  ),
              ],
            ),
          ],
        ),
        (
          j.sectionSpecial,
          [
            toggle(j.amrieh, d.amriehEligible, (v) => d.amriehEligible = v),
            toggle(
              j.disabilityFriendly,
              d.disabilityFriendly,
              (v) => d.disabilityFriendly = v,
            ),
          ],
        ),
      ],
    ];

    final body = Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      // Not a ListView: that drops the sections scrolled out of sight, and
      // a dropped field is never checked. An empty title went to the
      // server that way.
      child: SingleChildScrollView(
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (title, children) in sections) ...[
              SoftSurface(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 14,
                  children: [
                    Text(title, style: text.titleMedium),
                    ...children,
                  ],
                ),
              ),
              const SizedBox(height: BaghSpace.gutter),
            ],
            Text(
              m.submitWarning,
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
            const SizedBox(height: BaghSpace.gutter),
            if (_error case final error?) ...[
              FormMessage(error),
              const SizedBox(height: BaghSpace.gutter),
            ],
            BaghKey(
              label: m.saveDraft,
              icon: Icons.save_outlined,
              loading: _sending,
              expand: true,
              onPressed: _save,
            ),
          ],
        ),
      ),
    );

    final guarded = LeaveGuard(
      isDirty: () => _snapshot() != _saved,
      busy: _sending,
      child: SafeArea(top: false, child: body),
    );
    // Editing already has its frame from JobEditorScreen.
    if (_edit) return guarded;
    return Scaffold(
      appBar: AppBar(
        title: Text(m.newJob),
        actions: const [HelpAction('my-jobs')],
      ),
      body: guarded,
    );
  }
}
