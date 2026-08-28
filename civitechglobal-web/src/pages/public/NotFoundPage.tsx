import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="gradient-text text-7xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-text-primary">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 max-w-md text-text-secondary">{t.errors.notFoundBody}</p>
      <Link to="/" className="mt-6">
        <Button>{t.errors.goHome}</Button>
      </Link>
    </div>
  );
}
