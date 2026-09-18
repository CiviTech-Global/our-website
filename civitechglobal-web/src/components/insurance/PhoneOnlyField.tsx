import { Info } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { normalizePersianDigits } from '@/lib/persian';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

/**
 * The phone number, where there is no gateway to verify it with.
 *
 * PhoneVerification's twin for a deployment that sends no SMS. It asks for the
 * same number and skips the code, and says so — a form that quietly drops a
 * verification step people have seen elsewhere reads as broken, and somebody
 * would sit waiting for a text that is never coming.
 *
 * It also says what to keep, because the tracking code is now the only way
 * back to the request: there is no message to find it in later.
 */
export function PhoneOnlyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <FormField label={t.insurance.phoneLabel} htmlFor="insurance-phone">
        <Input
          id="insurance-phone"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09xxxxxxxxx"
          value={value}
          // Persian digits are what an Iranian keyboard produces; the server
          // wants ASCII. Converted as it is typed, as PhoneVerification does.
          onChange={(e) => onChange(normalizePersianDigits(e.target.value))}
        />
      </FormField>

      <p className="flex items-start gap-2 text-sm text-text-secondary">
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
        {t.insurance.noSmsNotice}
      </p>
    </div>
  );
}
