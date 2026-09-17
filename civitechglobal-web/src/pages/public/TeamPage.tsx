import { Github, Globe, Linkedin, Mail, UserRound } from 'lucide-react';
import { photoSrc, useTeam, type TeamMember } from '@/api/team';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The people behind the company.
 *
 * Arranged by the server: sections in the order the super admin set, members
 * in theirs, then anyone not placed in a section. A company with no sections
 * gets one clean list, because a heading only appears when there is one.
 */
export default function TeamPage() {
  const { t } = useLocale();
  useDocumentTitle(t.team.title, { description: t.seo.team });

  const { data, isLoading } = useTeam();
  const sections = data?.sections ?? [];
  const unsectioned = data?.unsectioned ?? [];
  const empty = !isLoading && sections.length === 0 && unsectioned.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.team.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">{t.team.subtitle}</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {empty && <EmptyState title={t.team.empty} />}

      {sections.map((section, index) => (
        <AnimatedSection key={section.id} delay={index * 0.05} className="mb-12">
          <section aria-labelledby={`team-section-${section.id}`}>
            <h2
              id={`team-section-${section.id}`}
              className="text-xl font-semibold text-text-primary"
            >
              {section.name}
            </h2>
            {section.description && (
              <p className="mt-1 text-sm text-text-secondary">{section.description}</p>
            )}
            <MemberGrid members={section.members} />
          </section>
        </AnimatedSection>
      ))}

      {unsectioned.length > 0 && (
        <AnimatedSection delay={sections.length * 0.05} className="mb-12">
          <section aria-label={sections.length > 0 ? t.team.otherMembers : t.team.title}>
            {/* Only titled when there are sections above it; alone, the page
                heading already says what this list is. */}
            {sections.length > 0 && (
              <h2 className="text-xl font-semibold text-text-primary">{t.team.otherMembers}</h2>
            )}
            <MemberGrid members={unsectioned} />
          </section>
        </AnimatedSection>
      )}
    </div>
  );
}

function MemberGrid({ members }: { members: TeamMember[] }) {
  return (
    <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.id}>
          <MemberCard member={member} />
        </li>
      ))}
    </ul>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const { t } = useLocale();
  const src = photoSrc(member.photoUrl);

  return (
    <Card className="flex h-full flex-col items-center text-center transition hover:border-brand-green-500/50">
      {src ? (
        <img
          src={src}
          // The name, not "photo of" — a screen reader announces the element
          // as an image already, so the prefix is noise read on every card.
          alt={member.name}
          loading="lazy"
          className="size-28 rounded-full border border-border-default object-cover"
        />
      ) : (
        <div
          className="flex size-28 items-center justify-center rounded-full border border-border-default bg-surface-200"
          aria-hidden="true"
        >
          <UserRound className="size-12 text-text-muted" />
        </div>
      )}

      <h3 className="mt-4 font-semibold text-text-primary">{member.name}</h3>
      <p className="mt-0.5 text-sm text-brand-green-600">{member.title}</p>

      {member.bio && (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-secondary">{member.bio}</p>
      )}

      <div className="mt-auto flex gap-1 pt-4">
        {member.email && (
          <IconLink href={`mailto:${member.email}`} label={t.team.emailLabel}>
            <Mail className="size-4" />
          </IconLink>
        )}
        {member.linkedin && (
          <IconLink href={member.linkedin} label="LinkedIn" external>
            <Linkedin className="size-4" />
          </IconLink>
        )}
        {member.github && (
          <IconLink href={member.github} label="GitHub" external>
            <Github className="size-4" />
          </IconLink>
        )}
        {member.website && (
          <IconLink href={member.website} label={t.team.websiteLabel} external>
            <Globe className="size-4" />
          </IconLink>
        )}
      </div>
    </Card>
  );
}

function IconLink({
  href,
  label,
  external,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      // noreferrer alongside noopener: these are addresses a colleague
      // supplied, and the referring URL is nobody else's business.
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex size-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-200 hover:text-text-primary"
    >
      {children}
    </a>
  );
}
