import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { isPasswordValid } from '@/lib/validation';
import { useRequestResetSms, useResetPasswordSms } from '@/api/sms';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

/**
 * Resetting a password with a code texted to the account's verified phone.
 *
 * Two steps on one screen: the account's email or username, then the code and
 * the new password. The first answer is the same whether or not the account
 * exists, so this screen never tells a stranger who has an account here.
 */
export function SmsPasswordReset() {
  const { t } = useLocale();
  const s = t.sms;
  const request = useRequestResetSms();
  const reset = useResetPasswordSms();

  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'identify' | 'code' | 'done'>('identify');
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await request.mutateAsync(identifier.trim());
      setStep('code');
    } catch (e) {
      setError(apiMessage(e, t.common.error));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) {
      setError(t.auth.passwordHint);
      return;
    }
    try {
      await reset.mutateAsync({ identifier: identifier.trim(), code: toLatinDigits(code), password });
      setStep('done');
    } catch (e) {
      setError(apiMessage(e, t.common.error));
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="size-12 text-brand-green-500" aria-hidden="true" />
        <p className="text-sm text-text-primary">{s.resetDone}</p>
        <Link to="/login" className="w-full">
          <Button className="w-full">{t.auth.backToLogin}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{step === 'identify' ? s.resetIntro : s.resetCodeSent}</p>

      {step === 'identify' ? (
        <form onSubmit={(e) => void sendCode(e)} noValidate className="flex flex-col gap-4">
          <FormField label={s.identifier} htmlFor="reset-identifier">
            <Input
              id="reset-identifier"
              autoComplete="username"
              dir="ltr"
              className="ltr text-start"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </FormField>
          <Button type="submit" isLoading={request.isPending} disabled={!identifier.trim()} className="w-full">
            {s.sendResetCode}
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
          <FormField label={s.codeLabel} htmlFor="reset-code">
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              className="ltr text-start"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d۰-۹]/g, ''))}
            />
          </FormField>
          <FormField label={s.newPassword} htmlFor="reset-password" hint={t.auth.passwordHint}>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <Button type="submit" isLoading={reset.isPending} disabled={code.length < 4 || !password} className="w-full">
            {s.resetSubmit}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-brand-red-500">
          {error}
        </p>
      )}
      <p className="text-xs text-text-secondary">{s.noPhoneHint}</p>
    </div>
  );
}
