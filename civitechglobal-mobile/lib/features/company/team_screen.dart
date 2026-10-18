import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

class TeamMember {
  const TeamMember({
    required this.id,
    required this.name,
    required this.title,
    this.bio,
    this.email,
    this.linkedin,
    this.github,
    this.website,
    this.photoUrl,
  });

  factory TeamMember.fromJson(Map<String, Object?> j) => TeamMember(
    id: '${j['id']}',
    name: '${j['name'] ?? ''}',
    title: '${j['title'] ?? ''}',
    bio: j['bio'] as String?,
    email: j['email'] as String?,
    linkedin: j['linkedin'] as String?,
    github: j['github'] as String?,
    website: j['website'] as String?,
    photoUrl: j['photoUrl'] as String?,
  );

  final String id;
  final String name;
  final String title;
  final String? bio;
  final String? email;
  final String? linkedin;
  final String? github;
  final String? website;
  final String? photoUrl;
}

typedef TeamSection = ({
  String name,
  String? description,
  List<TeamMember> members,
});

/// `GET /team`: published sections in order, and the members in none.
final teamProvider = FutureProvider<List<TeamSection>>((ref) async {
  ref.watch(l10nProvider.select((l) => l.language));
  return ref
      .read(apiClientProvider)
      .get(
        '/team',
        parse: (d) {
          final map = d! as Map;
          List<TeamMember> members(Object? list) => [
            for (final m in (list as List? ?? const []))
              TeamMember.fromJson(m as Map<String, Object?>),
          ];
          return [
            for (final section in (map['sections'] as List? ?? const []))
              (
                name: '${(section as Map)['name']}',
                description: section['description'] as String?,
                members: members(section['members']),
              ),
            if ((map['unsectioned'] as List? ?? const []).isNotEmpty)
              (
                name: '',
                description: null,
                members: members(map['unsectioned']),
              ),
          ];
        },
      );
});

class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final team = ref.watch(teamProvider);
    return ContentPage(
      title: s.team.title,
      subtitle: s.team.subtitle,
      helpId: 'team',
      children: [
        AsyncView(
          value: team,
          onRetry: () => ref.invalidate(teamProvider),
          isEmpty: (sections) => sections.every((x) => x.members.isEmpty),
          empty: s.team.empty,
          data: (sections) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final section in sections)
                ContentSection(
                  title: section.name.isEmpty
                      ? s.team.otherMembers
                      : section.name,
                  subtitle: section.description,
                  children: [
                    for (final (i, member) in section.members.indexed)
                      _MemberCard(member: member, tint: i),
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MemberCard extends ConsumerWidget {
  const _MemberCard({required this.member, required this.tint});

  final TeamMember member;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final links = <(IconData, String, Uri)>[
      if (member.email case final e? when e.isNotEmpty)
        (
          Icons.mail_outline_rounded,
          s.team.emailLabel,
          Uri(scheme: 'mailto', path: e),
        ),
      if (member.linkedin case final l? when l.isNotEmpty)
        (Icons.work_outline_rounded, 'LinkedIn', Uri.parse(l)),
      if (member.github case final g? when g.isNotEmpty)
        (Icons.code_rounded, 'GitHub', Uri.parse(g)),
      if (member.website case final w? when w.isNotEmpty)
        (Icons.language_rounded, s.team.websiteLabel, Uri.parse(w)),
    ];
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            spacing: 14,
            children: [
              RemoteImage(
                url: apiAsset(member.photoUrl),
                width: 64,
                height: 64,
                radius: 32,
                tint: tint,
                initials: initialsOf(member.name),
                semanticLabel: member.name,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(member.name, style: text.titleMedium),
                    Text(member.title, style: text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          if (member.bio case final bio? when bio.isNotEmpty)
            Text(bio, style: text.bodyMedium?.copyWith(color: c.ink2)),
          if (links.isNotEmpty)
            Wrap(
              spacing: 4,
              children: [
                for (final (icon, label, uri) in links)
                  IconButton(
                    tooltip: label,
                    icon: Icon(icon, size: 20),
                    onPressed: () =>
                        launchUrl(uri, mode: LaunchMode.externalApplication),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
