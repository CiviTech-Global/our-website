import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/haptics.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/tokens.dart';
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
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: _SoftNavBar(
          children: [
            for (var i = 0; i < 2; i++)
              _NavItem(
                icon: items[i].$1,
                selectedIcon: items[i].$2,
                label: items[i].$3,
                selected: shell.currentIndex == i,
                onTap: () => go(i),
              ),
            _StartKey(
              label: s.mobile.tabStart,
              onTap: () => showStartSheet(context),
            ),
            for (var i = 2; i < 4; i++)
              _NavItem(
                icon: items[i].$1,
                selectedIcon: items[i].$2,
                label: items[i].$3,
                selected: shell.currentIndex == i,
                onTap: () => go(i),
              ),
          ],
        ),
      ),
    );
  }
}

class _SoftNavBar extends StatelessWidget {
  const _SoftNavBar({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final highContrast = MediaQuery.highContrastOf(context);
    return Container(
      height: 68,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: ShapeDecoration(
        color: c.surface,
        shape: StadiumBorder(
          side: highContrast
              ? BorderSide(color: c.edge, width: 1.5)
              : BorderSide.none,
        ),
        shadows: highContrast ? const [] : BaghDepth.float(c),
      ),
      child: Row(
        children: [for (final child in children) Expanded(child: child)],
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
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: (selected ? BaghType.weight(text, 750) : text).copyWith(
                color: color,
                fontSize: 12,
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
    return Center(
      child: Pressable(
        onPressed: onTap,
        semanticLabel: label,
        builder: (context, depth) {
          final travel = 3 * depth.clamp(0.0, 1.0);
          return Transform.translate(
            offset: Offset(0, travel - 14),
            child: Container(
              width: 56,
              height: 56,
              decoration: ShapeDecoration(
                color: c.primary,
                shape: const CircleBorder(),
                shadows: [
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
      ),
    );
  }
}
