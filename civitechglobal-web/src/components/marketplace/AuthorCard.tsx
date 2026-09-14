import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import type { AuthorProfile } from '@/types/marketplace';
import { RatingStars } from './RatingStars';
import { VerifiedBadge } from './VerifiedBadge';

interface AuthorCardProps {
  profile: AuthorProfile;
}

/**
 * Who is behind a listing, when they have chosen to be known: the handle, the
 * headline, the verification check and the reputation line, all linking to
 * the full public profile. Listings whose author has no username render
 * nothing at all — anonymity is the default, this card is the opt-in.
 */
export function AuthorCard({ profile }: AuthorCardProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-200 p-4 dark:border-surface-300">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/profiles/${profile.username}`}
          className="font-semibold text-text-primary hover:text-brand-600"
        >
          @{profile.username}
        </Link>
        {profile.verified && <VerifiedBadge />}
      </div>
      {profile.headline && <p className="text-sm text-text-secondary">{profile.headline}</p>}
      <div className="flex items-center justify-between gap-2">
        <RatingStars avg={profile.ratingAvg} count={profile.ratingCount} />
        <Link to={`/profiles/${profile.username}`} className="text-xs text-brand-600 hover:underline">
          {t.market.viewProfile}
        </Link>
      </div>
    </div>
  );
}
