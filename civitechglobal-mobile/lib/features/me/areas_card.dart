import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/capabilities.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import 'workspace_data.dart';

/// One screen inside an area.
typedef _Link = ({IconData icon, String label, String href});

/// A labelled group of screens, as the web sidebar's sections.
typedef _Section = ({
  String id,
  String label,
  String hint,
  bool? inUse,
  List<_Link> links,
});

/// "Your areas": the member dashboard's screens, grouped as on the web —
/// Work (hiring, job search, my projects, freelancing) and Buy & sell
/// (shops, books, purchases).
///
/// The sections a member uses come first; the rest wait behind one
/// "N more sections" row. Somebody who uses none of them yet sees them all,
/// so the way in is never hidden from a new member. Until the areas answer,
/// everything shows.
class AreasCard extends ConsumerStatefulWidget {
  const AreasCard({super.key});

  @override
  ConsumerState<AreasCard> createState() => _AreasCardState();
}

class _AreasCardState extends ConsumerState<AreasCard> {
  bool _showAll = false;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final n = s.dashNav;
    final language = ref.watch(l10nProvider).language;
    final caps = ref.watch(capabilitiesProvider).value;
    bool on(String flag) => caps?.feature(flag) ?? false;
    final areas = ref.watch(memberAreasProvider).value;
    bool? uses(String area) => areas?.has(area);

    final sections = <_Section>[
      (
        id: 'hiring',
        label: n.hiring,
        hint: n.hiringHint,
        inUse: uses('hiring'),
        links: [
          (
            icon: Icons.work_outline_rounded,
            label: s.market.myJobs,
            href: '/dashboard/jobs',
          ),
          if (on('jobsV2'))
            (
              icon: Icons.apartment_rounded,
              label: s.jobs.navCompany,
              href: '/dashboard/company',
            ),
        ],
      ),
      (
        id: 'job-search',
        label: n.jobSearch,
        hint: n.jobSearchHint,
        inUse: uses('jobSearch'),
        links: [
          (
            icon: Icons.description_outlined,
            label: s.market.myApplications,
            href: '/dashboard/applications',
          ),
          if (on('jobsV2')) ...[
            (
              icon: Icons.bookmark_outline_rounded,
              label: s.jobs.navSavedJobs,
              href: '/dashboard/saved-jobs',
            ),
            (
              icon: Icons.notifications_active_outlined,
              label: s.jobs.navAlerts,
              href: '/dashboard/job-alerts',
            ),
          ],
        ],
      ),
      (
        id: 'client',
        label: n.client,
        hint: n.clientHint,
        inUse: areas == null
            ? null
            : areas.has('client') || areas.has('collaborations'),
        links: [
          (
            icon: Icons.folder_open_rounded,
            label: s.market.myProjects,
            href: '/dashboard/projects',
          ),
          (
            icon: Icons.handshake_outlined,
            label: s.market.myAwards,
            href: '/dashboard/awards',
          ),
        ],
      ),
      (
        id: 'freelance',
        label: n.freelance,
        hint: n.freelanceHint,
        inUse: uses('freelance'),
        links: [
          (
            icon: Icons.gavel_rounded,
            label: on('projectsV2') ? s.work.navProposals : s.market.myBids,
            href: '/dashboard/bids',
          ),
          if (on('projectsV2')) ...[
            (
              icon: Icons.mark_email_unread_outlined,
              label: s.work.navInvites,
              href: '/dashboard/invites',
            ),
            (
              icon: Icons.bookmark_add_outlined,
              label: s.work.navSavedProjects,
              href: '/dashboard/saved-projects',
            ),
            (
              icon: Icons.notification_add_outlined,
              label: s.work.navProjectAlerts,
              href: '/dashboard/project-alerts',
            ),
            (
              icon: Icons.layers_outlined,
              label: s.work.navMyServices,
              href: '/dashboard/services',
            ),
            (
              icon: Icons.receipt_long_outlined,
              label: s.work.navOrders,
              href: '/dashboard/service-orders',
            ),
          ],
        ],
      ),
      (
        id: 'shops',
        label: n.shops,
        hint: n.shopsHint,
        inUse: uses('shops'),
        links: [
          if (on('tradeMaster'))
            (
              icon: Icons.storefront_outlined,
              label: s.trademaster.myShops,
              href: '/dashboard/shops',
            ),
        ],
      ),
      (
        id: 'books',
        label: n.books,
        hint: n.booksHint,
        inUse: uses('books'),
        links: [
          (
            icon: Icons.menu_book_outlined,
            label: on('booksV2') ? s.bookshop.navMyBooks : s.books.myBooks,
            href: '/dashboard/books',
          ),
        ],
      ),
      (
        id: 'buying',
        label: n.buying,
        hint: n.buyingHint,
        inUse: uses('buying'),
        links: [
          if (on('booksV2'))
            (
              icon: Icons.shopping_cart_outlined,
              label: s.bookshop.navPurchases,
              href: '/dashboard/book-purchases',
            ),
        ],
      ),
    ].where((section) => section.links.isNotEmpty).toList();

    final anyInUse = sections.any((section) => section.inUse ?? false);
    final shown = anyInUse
        ? sections.where((x) => x.inUse ?? true).toList()
        : sections;
    final tucked = anyInUse
        ? sections.where((x) => x.inUse == false).toList()
        : <_Section>[];
    final visible = _showAll ? [...shown, ...tucked] : shown;

    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;

    return SoftSurface(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(n.areasTitle, style: text.titleMedium),
          ),
          for (final section in visible) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    section.label,
                    style: text.labelLarge?.copyWith(color: c.primary),
                  ),
                  Text(
                    section.hint,
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
                ],
              ),
            ),
            for (final link in section.links)
              ListTile(
                dense: true,
                leading: Icon(link.icon),
                title: Text(link.label),
                trailing: Icon(forward),
                onTap: () => openLink(context, ref, link.href),
              ),
          ],
          if (tucked.isNotEmpty)
            ListTile(
              leading: Icon(
                _showAll
                    ? Icons.unfold_less_rounded
                    : Icons.unfold_more_rounded,
              ),
              title: Text(
                _showAll
                    ? n.fewerTools
                    : n.moreTools.fill({
                        'count': localDigits(tucked.length, language),
                      }),
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
              subtitle: _showAll
                  ? null
                  : Text(
                      tucked
                          .map((x) => x.label)
                          .join(language == 'fa' ? '، ' : ', '),
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
              onTap: () => setState(() => _showAll = !_showAll),
            ),
        ],
      ),
    );
  }
}
