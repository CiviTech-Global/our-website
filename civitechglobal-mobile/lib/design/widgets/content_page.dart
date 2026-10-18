import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../features/help/help_sheet.dart';
import '../palette.dart';
import '../tokens.dart';
import 'bagh_key.dart';
import 'kinetic_words.dart';
import 'soft_surface.dart';

/// The frame of a reading page (services, about, team, blog...): a kinetic
/// title and a line under it, then sections, all in the readable column.
class ContentPage extends StatelessWidget {
  const ContentPage({
    required this.title,
    required this.children,
    this.subtitle,
    this.eyebrow,
    this.helpId,
    this.actions = const [],
    this.bottom,
    super.key,
  });

  final String title;
  final String? subtitle;
  final String? eyebrow;
  final String? helpId;
  final List<Widget> actions;

  /// A key kept in reach under the page, for one that is long.
  final Widget? bottom;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        actions: [...actions, if (helpId != null) HelpAction(helpId!)],
      ),
      bottomNavigationBar: bottom == null
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: BaghLayout.readablePadding(
                  context,
                  top: 8,
                  bottom: 12,
                ),
                // Its own height, not all the room a bottom bar is offered.
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [bottom!],
                ),
              ),
            ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            if (eyebrow != null) ...[
              Text(
                eyebrow!,
                style: BaghType.weight(
                  text.labelLarge!,
                  700,
                ).copyWith(color: c.primary),
              ),
              const SizedBox(height: 6),
            ],
            KineticWords(
              title,
              style: text.headlineLarge,
              emphasisColor: c.primary,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 10),
              Text(subtitle!, style: text.bodyLarge?.copyWith(color: c.ink2)),
            ],
            ...children,
          ],
        ),
      ),
    );
  }
}

/// A titled section of a content page.
class ContentSection extends StatelessWidget {
  const ContentSection({
    required this.title,
    required this.children,
    this.subtitle,
    super.key,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: BaghSpace.section * 1.5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Text(title, style: text.titleLarge),
          if (subtitle != null)
            Text(
              subtitle!,
              style: text.bodyMedium?.copyWith(
                color: BaghColors.of(context).ink2,
              ),
            ),
          ...children,
        ],
      ),
    );
  }
}

/// A title and its body on a soft or tinted surface.
class InfoCard extends StatelessWidget {
  const InfoCard({
    required this.title,
    required this.body,
    this.tint,
    this.icon,
    this.onTap,
    super.key,
  });

  final String title;
  final String body;

  /// A module tint index; plain surface when null.
  final int? tint;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final tone = tint == null ? null : moduleTint(c, tint!);
    final ink = tone?.ink ?? c.ink;
    return SoftSurface(
      tint: tone,
      onTap: onTap,
      semanticLabel: onTap == null ? null : title,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 12,
        children: [
          if (icon != null) Icon(icon, size: 26),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Text(
                  title,
                  style: BaghType.weight(
                    text.titleSmall!,
                    750,
                  ).copyWith(color: ink),
                ),
                if (body.isNotEmpty)
                  Text(
                    body,
                    style: text.bodyMedium?.copyWith(
                      color: tone?.ink ?? c.ink2,
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

/// Numbered steps: a process, in the reader's digits.
class StepList extends StatelessWidget {
  const StepList({required this.steps, required this.language, super.key});

  final List<(String, String)> steps;
  final String language;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Column(
      spacing: 10,
      children: [
        for (final (i, (title, body)) in steps.indexed)
          SoftSurface(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 14,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: c.primarySoft.fill,
                  child: Text(
                    localDigits(i + 1, language),
                    style: BaghType.weight(
                      text.titleSmall!,
                      800,
                    ).copyWith(color: c.primarySoft.ink),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 4,
                    children: [
                      Text(title, style: text.titleSmall),
                      if (body.isNotEmpty)
                        Text(
                          body,
                          style: text.bodyMedium?.copyWith(color: c.ink2),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// The closing call to action: a title, a line, and up to two keys.
class CtaCard extends StatelessWidget {
  const CtaCard({
    required this.title,
    required this.primary,
    this.body,
    this.secondary,
    super.key,
  });

  final String title;
  final String? body;
  final (String, VoidCallback) primary;
  final (String, VoidCallback)? secondary;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: BaghSpace.section * 1.5),
      child: SoftSurface(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 12,
          children: [
            Text(title, style: text.titleLarge, textAlign: TextAlign.center),
            if (body != null)
              Text(
                body!,
                style: text.bodyMedium?.copyWith(color: c.ink2),
                textAlign: TextAlign.center,
              ),
            BaghKey(label: primary.$1, onPressed: primary.$2, expand: true),
            if (secondary case final s?)
              BaghKey(
                label: s.$1,
                onPressed: s.$2,
                kind: BaghKeyKind.outline,
                expand: true,
              ),
          ],
        ),
      ),
    );
  }
}
