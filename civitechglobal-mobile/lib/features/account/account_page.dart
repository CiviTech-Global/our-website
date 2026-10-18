import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../design/motion.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';

/// The frame every account screen shares: a small garden star, a title and a
/// line under it, then the form on a soft surface. The guide for the screen
/// is one tap away in the app bar.
class AccountPage extends StatelessWidget {
  const AccountPage({
    required this.title,
    required this.children,
    this.subtitle,
    this.helpId,
    super.key,
  });

  final String title;
  final String? subtitle;
  final String? helpId;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(actions: [if (helpId != null) HelpAction(helpId!)]),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: GirihStar(color: c.primary, size: 36),
            ),
            const SizedBox(height: 12),
            Text(title, style: text.headlineMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!, style: text.bodyLarge?.copyWith(color: c.ink2)),
            ],
            const SizedBox(height: BaghSpace.section),
            SoftSurface(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 16,
                children: children,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A message under the form when the server says no: its own words when it
/// has them, the dictionary's otherwise.
class FormMessage extends StatelessWidget {
  const FormMessage(this.message, {this.positive = false, super.key});

  final String message;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final tint = positive ? c.primarySoft : c.accentSoft;
    return Semantics(
      liveRegion: true,
      child: SoftSurface(
        tint: tint,
        radius: BaghRadius.tile,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          spacing: 10,
          children: [
            Icon(
              positive ? Icons.check_circle_outline : Icons.error_outline,
              size: 20,
            ),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
  }
}

/// The words for a failed request: the server's own message when it sent
/// one (it writes them for people), the dictionary's otherwise. Never the
/// error's own text, which is for developers ("Unable to load asset...").
String describeError(Strings s, Object error, {String? fallback}) {
  if (error is! ApiException && error is! DioException) {
    return fallback ?? s.common.error;
  }
  final e = ApiException.from(error);
  if (e.offline) return s.mobile.offline;
  if (e.message.isNotEmpty) return e.message;
  return fallback ?? s.common.error;
}

/// Field rules, the same ones the server enforces
/// (civitechglobal-server/src/utils/passwordPolicy.ts), so most mistakes are
/// caught before a request is made.
class Validators {
  const Validators(this.s);

  final Strings s;

  String? required(String? v) =>
      (v == null || v.trim().isEmpty) ? s.auth.required : null;

  String? email(String? v) {
    if (required(v) case final e?) return e;
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v!.trim())
        ? null
        : s.auth.invalidEmail;
  }

  String? password(String? v) {
    if (required(v) case final e?) return e;
    final p = v!;
    final ok =
        p.length >= 12 &&
        p.length <= 128 &&
        RegExp('[a-z]').hasMatch(p) &&
        RegExp('[A-Z]').hasMatch(p) &&
        RegExp('[0-9]').hasMatch(p) &&
        RegExp('[^A-Za-z0-9]').hasMatch(p);
    return ok ? null : s.auth.passwordHint;
  }
}

/// A password field with a show/hide toggle.
class PasswordField extends ConsumerStatefulWidget {
  const PasswordField({
    required this.controller,
    required this.label,
    this.validator,
    this.helper,
    this.newPassword = false,
    this.onSubmitted,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final String? helper;
  final String? Function(String?)? validator;
  final bool newPassword;
  final ValueChanged<String>? onSubmitted;

  @override
  ConsumerState<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends ConsumerState<PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    return TextFormField(
      controller: widget.controller,
      obscureText: !_visible,
      autocorrect: false,
      enableSuggestions: false,
      textDirection: TextDirection.ltr,
      autofillHints: [
        if (widget.newPassword)
          AutofillHints.newPassword
        else
          AutofillHints.password,
      ],
      validator: widget.validator,
      onFieldSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        labelText: widget.label,
        helperText: widget.helper,
        suffixIcon: IconButton(
          tooltip: _visible ? s.mobile.hidePassword : s.mobile.showPassword,
          icon: Icon(
            _visible
                ? Icons.visibility_off_outlined
                : Icons.visibility_outlined,
          ),
          onPressed: () => setState(() => _visible = !_visible),
        ),
      ),
    );
  }
}

/// Brings the first field [form] flagged into view, as the web does after a
/// refused submit: on a long form the mistake is often far above the key.
void revealFirstError(GlobalKey<FormState> form) {
  Element? first;
  void visit(Element element) {
    if (first != null) return;
    if (element is StatefulElement &&
        element.state is FormFieldState &&
        (element.state as FormFieldState).hasError) {
      first = element;
      return;
    }
    element.visitChildElements(visit);
  }

  form.currentContext?.visitChildElements(visit);
  if (first case final element?) {
    Scrollable.ensureVisible(
      element,
      alignment: 0.2,
      duration: MediaQuery.maybeDisableAnimationsOf(element) ?? false
          ? Duration.zero
          : BaghDurations.slow,
      curve: Curves.easeOutCubic,
    );
  }
}
