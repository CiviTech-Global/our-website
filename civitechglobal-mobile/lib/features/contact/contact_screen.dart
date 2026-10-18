import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';

/// Contact, as a ticket, the way the web does it.
///
/// There is no outbound email in this deployment, so nobody can be told
/// their message was answered: they come back with the tracking code. So the
/// code is presented as something to keep (with a copy key), and the lookup
/// sits on the same screen.
class ContactScreen extends ConsumerStatefulWidget {
  const ContactScreen({super.key});

  @override
  ConsumerState<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends ConsumerState<ContactScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  final _code = TextEditingController();
  bool _sending = false;
  String? _issued;
  String? _sendError;
  bool _tracking = false;
  Map<String, Object?>? _ticket;
  String? _trackError;

  @override
  void dispose() {
    for (final c in [_name, _email, _subject, _message, _code]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _send() async {
    if (_sending || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _sending = true;
      _sendError = null;
    });
    try {
      final code = await ref
          .read(apiClientProvider)
          .post(
            '/contact',
            body: {
              'name': _name.text.trim(),
              'email': _email.text.trim(),
              if (_subject.text.trim().isNotEmpty)
                'subject': _subject.text.trim(),
              'message': _message.text.trim(),
            },
            parse: (d) => '${(d! as Map)['trackingCode']}',
          );
      await ref.read(hapticsProvider).success();
      setState(() => _issued = code);
    } catch (e) {
      setState(() => _sendError = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _track() async {
    final s = ref.read(stringsProvider);
    final code = toLatinDigits(
      _code.text,
    ).trim().toUpperCase().replaceAll(' ', '');
    if (_tracking || code.isEmpty) return;
    setState(() {
      _tracking = true;
      _trackError = null;
      _ticket = null;
    });
    try {
      final ticket = await ref
          .read(apiClientProvider)
          .get(
            '/contact/track/$code',
            parse: (d) => d! as Map<String, Object?>,
          );
      setState(() => _ticket = ticket);
    } catch (e) {
      setState(
        () => _trackError = describeError(
          s,
          e,
          fallback: s.contact.trackNotFound,
        ),
      );
    } finally {
      if (mounted) setState(() => _tracking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);

    return ContentPage(
      title: s.contact.title,
      subtitle: s.contact.subtitle,
      helpId: 'contact',
      children: [
        ContentSection(
          title: s.contact.infoTitle,
          children: [
            Text(
              s.contact.infoBody,
              style: text.bodyMedium?.copyWith(color: c.ink2),
            ),
          ],
        ),
        const SizedBox(height: BaghSpace.section),
        if (_issued case final code?)
          SoftSurface(
            tint: c.primarySoft,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Text(
                  s.contact.issuedTitle,
                  style: text.titleMedium?.copyWith(color: c.primarySoft.ink),
                ),
                Text(
                  s.contact.issuedBody,
                  style: text.bodyMedium?.copyWith(color: c.primarySoft.ink),
                ),
                SelectableText(
                  code,
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.ltr,
                  style: BaghType.weight(
                    text.headlineSmall!,
                    800,
                  ).copyWith(color: c.primarySoft.ink, letterSpacing: 2),
                ),
                Text(
                  s.contact.issuedWarning,
                  style: text.bodySmall?.copyWith(color: c.primarySoft.ink),
                ),
                BaghKey(
                  label: s.contact.copyCode,
                  icon: Icons.copy_rounded,
                  expand: true,
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(s.contact.codeCopied)),
                    );
                  },
                ),
                BaghKey(
                  label: s.contact.sendAnother,
                  kind: BaghKeyKind.outline,
                  expand: true,
                  onPressed: () => setState(() {
                    _issued = null;
                    _message.clear();
                    _subject.clear();
                  }),
                ),
              ],
            ),
          )
        else
          SoftSurface(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 16,
                children: [
                  TextFormField(
                    controller: _name,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.name],
                    validator: v.required,
                    decoration: InputDecoration(labelText: s.contact.formName),
                  ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textDirection: TextDirection.ltr,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    validator: v.email,
                    decoration: InputDecoration(
                      labelText: s.contact.formEmail,
                      helperText: s.contact.formEmailHint,
                    ),
                  ),
                  TextFormField(
                    controller: _subject,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: s.contact.formSubject,
                    ),
                  ),
                  TextFormField(
                    controller: _message,
                    minLines: 4,
                    maxLines: 10,
                    validator: v.required,
                    decoration: InputDecoration(
                      labelText: s.contact.formMessage,
                      alignLabelWithHint: true,
                    ),
                  ),
                  Text(s.contact.formNote, style: text.bodySmall),
                  if (_sendError != null) FormMessage(_sendError!),
                  BaghKey(
                    label: s.contact.formSubmit,
                    onPressed: _send,
                    loading: _sending,
                    expand: true,
                  ),
                ],
              ),
            ),
          ),
        ContentSection(
          title: s.contact.trackTitle,
          subtitle: s.contact.trackBody,
          children: [
            TextField(
              controller: _code,
              textDirection: TextDirection.ltr,
              textCapitalization: TextCapitalization.characters,
              onSubmitted: (_) => _track(),
              decoration: InputDecoration(hintText: s.contact.trackPlaceholder),
            ),
            BaghKey(
              label: s.common.search,
              kind: BaghKeyKind.outline,
              onPressed: _track,
              loading: _tracking,
              expand: true,
            ),
            if (_trackError != null) FormMessage(_trackError!),
            if (_ticket case final t?) _Ticket(ticket: t),
          ],
        ),
      ],
    );
  }
}

class _Ticket extends ConsumerWidget {
  const _Ticket({required this.ticket});

  final Map<String, Object?> ticket;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final status = '${ticket['status']}';
    final tint = switch (status) {
      'ANSWERED' => c.primarySoft,
      'OPEN' => c.tints[2],
      _ => c.tints[4],
    };
    String date(Object? iso) {
      final d = DateTime.tryParse('$iso');
      return d == null ? '' : formatDate(d, language);
    }

    final replies = (ticket['replies'] as List? ?? const [])
        .cast<Map<String, Object?>>();
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                (ticket['subject'] as String?)?.isNotEmpty == true
                    ? '${ticket['subject']}'
                    : s.contact.noSubject,
                style: text.titleMedium,
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 2,
                ),
                decoration: ShapeDecoration(
                  color: tint.fill,
                  shape: const StadiumBorder(),
                ),
                child: Text(
                  s.contact.statuses.label(status),
                  style: text.labelSmall?.copyWith(color: tint.ink),
                ),
              ),
            ],
          ),
          Text(date(ticket['createdAt']), style: text.bodySmall),
          Text('${ticket['message']}', style: text.bodyMedium),
          const Divider(),
          if (replies.isEmpty)
            Text(
              s.contact.noReplyYet,
              style: text.bodyMedium?.copyWith(color: c.ink2),
            )
          else
            for (final r in replies)
              SoftSurface(
                tint: c.primarySoft,
                radius: BaghRadius.tile,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 4,
                  children: [
                    Text(
                      '${s.contact.staffReply} · ${date(r['createdAt'])}',
                      style: BaghType.weight(
                        text.labelMedium!,
                        700,
                      ).copyWith(color: c.primarySoft.ink),
                    ),
                    Text(
                      '${r['body']}',
                      style: text.bodyMedium?.copyWith(
                        color: c.primarySoft.ink,
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
