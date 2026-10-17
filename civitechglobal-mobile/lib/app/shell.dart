import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/haptics.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/tokens.dart';
import '../design/widgets/glass_pane.dart';
import '../design/widgets/pressable.dart';
import '../features/start/start_sheet.dart';
import '../l10n/l10n.dart';

/// The app's frame: four places and a "start" key between them, on a soft
/// pill that floats above the content.
///
/// Each tab keeps its own history (go_router's StatefulShellRoute), so
/// leaving Explore halfway down a list and coming back finds it as it was.
/// Switching tabs fades through, never slides: the four are peers, not a
/// sequence.
class AppShell extends ConsumerWidget {
  const AppShell({required this.shell, super.key});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final items = [
      (Icons.home_outlined, Icons.home_rounded, s.mobile.tabHome),
      (Icons.explore_outlined, Icons.explore_rounded, s.mobile.tabExplore),
      (Icons.forum_outlined, Icons.forum_rounded, s.mobile.tabInbox),
      (Icons.person_outline_rounded, Icons.person_rounded, s.mobile.tabMe),
    ];

    void go(int index) {
      ref.read(hapticsProvider).selection();
      shell.goBranch(index, initialLocation: index == shell.currentIndex);
    }

    return Scaffold(
      extendBody: true,
      body: AnimatedSwitcher(
        duration: reduceMotion(context, ref)
            ? Duration.zero
            : BaghDurations.slow,
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        child: KeyedSubtree(key: ValueKey(shell.currentIndex), child: shell),
      ),
      // Content scrolls under the bar and the system buttons (the app draws
      // edge to edge), so the ground rises behind them as a soft fade:
      // nothing ends up legible-but-covered behind a button.
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            // Transparent above the bar, solid from the bar down.
            stops: const [0, 0.2, 1],
            colors: [
              BaghColors.of(context).ground.withValues(alpha: 0),
              BaghColors.of(context).ground,
              BaghColors.of(context).ground,
            ],
          ),
        ),
        child: SafeArea(
          minimum: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: _SoftNavBar(
            items: [
              for (var i = 0; i < 4; i++)
                _NavItem(
                  icon: items[i].$1,
                  selectedIcon: items[i].$2,
                  label: items[i].$3,
                  selected: shell.currentIndex == i,
                  onTap: () => go(i),
                ),
            ],
            start: _StartKey(
              label: s.mobile.tabStart,
              onTap: () => showStartSheet(context),
            ),
          ),
        ),
      ),
    );
  }
}

/// The floating bar: a pill with four places and the raised start key.
///
/// The pill is a background layer inside a box taller than itself, and the
/// items sit on top of it, unclipped. That matters twice over. The glass
/// pane has to clip its blur to the pill, which used to cut the raised key in
/// half; and in every style the key's raised top lay outside the bar's
/// bounds, where Flutter delivers no touches, so its upper part never
/// responded. Here the key is wholly inside the box: drawn whole, tappable to
/// its edge.
///
/// Labels stop growing at 1.3× text size: the bar is a fixed-height control
/// that must not push the page, and its icons carry the meaning too. Pages
/// themselves follow the full system text size.
class _SoftNavBar extends StatelessWidget {
  const _SoftNavBar({required this.items, required this.start});

  final List<Widget> items;
  final Widget start;

  static const barHeight = 68.0;

  /// How far the start key rises above the pill.
  static const raise = 10.0;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final highContrast = MediaQuery.highContrastOf(context);
    final glass = c.glass && !highContrast;

    final pill = glass
        ? DecoratedBox(
            // The shadows sit outside the pane, which clips its own blur.
            decoration: ShapeDecoration(
              shape: const StadiumBorder(),
              shadows: BaghDepth.lift(c, 2),
            ),
            child: const GlassPane(
              opacity: 1.2,
              shape: StadiumBorder(),
              child: SizedBox.expand(),
            ),
          )
        : DecoratedBox(
            decoration: ShapeDecoration(
              color: c.surface,
              shape: StadiumBorder(
                side: highContrast
                    ? BorderSide(color: c.edge, width: 1.5)
                    : BorderSide.none,
              ),
              shadows: highContrast ? const [] : BaghDepth.float(c),
            ),
          );

    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.3,
      // Wide screens (tablets, landscape) keep the bar a comfortable reach
      // instead of stretching five targets across the whole width.
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: SizedBox(
            height: barHeight + raise,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: barHeight,
                  child: pill,
                ),
                Positioned(
                  left: 6,
                  right: 6,
                  bottom: 0,
                  height: barHeight,
                  child: Row(
                    children: [
                      Expanded(child: items[0]),
                      Expanded(child: items[1]),
                      // The start key's column, kept clear for it.
                      const Expanded(child: SizedBox()),
                      Expanded(child: items[2]),
                      Expanded(child: items[3]),
                    ],
                  ),
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Center(child: start),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme.labelSmall!;
    final color = selected ? c.primary : c.ink2;
    return Semantics(
      selected: selected,
      child: Pressable(
        onPressed: onTap,
        semanticLabel: label,
        focusRadius: 20,
        builder: (context, _) => Column(
          mainAxisAlignment: MainAxisAlignment.center,
          spacing: 2,
          children: [
            AnimatedContainer(
              duration: BaghDurations.moderate,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
              decoration: ShapeDecoration(
                color: selected ? c.primarySoft.fill : Colors.transparent,
                shape: const StadiumBorder(),
              ),
              child: Icon(
                selected ? selectedIcon : icon,
                color: selected ? c.primarySoft.ink : color,
                size: 22,
              ),
            ),
            // Scaled down a little rather than cut off when a language's word
            // is long for a narrow phone (test/layout_audit_test.dart checks
            // every language stays readable at 320 px).
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                label,
                maxLines: 1,
                style: (selected ? BaghType.weight(text, 750) : text).copyWith(
                  color: color,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The centre key: raised above the bar, on its tile lip, and the one place
/// the expressive spring is allowed in the frame.
class _StartKey extends StatelessWidget {
  const _StartKey({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final glass = c.glass && !MediaQuery.highContrastOf(context);
    return Pressable(
      onPressed: onTap,
      semanticLabel: label,
      builder: (context, depth) {
        final pressed = depth.clamp(0.0, 1.0);
        final travel = 3 * pressed;
        return Padding(
          // Sinks into the room left for its lip as it is pressed.
          padding: EdgeInsets.only(top: travel, bottom: 3 - travel),
          child: Container(
            width: 56,
            height: 56,
            decoration: ShapeDecoration(
              color: glass ? null : c.primary,
              gradient: glass
                  ? LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color.lerp(c.primary, const Color(0xFFFFFFFF), 0.18)!,
                        c.primary,
                      ],
                    )
                  : null,
              shape: CircleBorder(
                side: glass ? BorderSide(color: c.rim) : BorderSide.none,
              ),
              shadows: glass
                  ? BaghDepth.lift(c, 1.6 * (1 - pressed))
                  : [
                      if (travel < 3)
                        BaghDepth.lip(
                          Color.lerp(c.primary, const Color(0xFF000000), 0.35)!,
                        ).copyWith(offset: Offset(0, 3 - travel)),
                      ...BaghDepth.float(c),
                    ],
            ),
            child: Icon(Icons.add_rounded, color: c.onPrimary, size: 30),
          ),
        );
      },
    );
  }
}
