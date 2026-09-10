import { useState } from 'react';
import { Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  useBeginMfaEnrolment,
  useConfirmMfaEnrolment,
  useDisableMfa,
  useMfaStatus,
} from '@/api/mfa';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Two-factor enrolment, on the profile page.
 *
 * Enrolment is two steps because the server insists: it hands out a secret,
 * then only switches MFA on once a code proves the authenticator actually took
 * it. Without that, anyone whose app silently failed to save the secret locks
 * themselves out.
 *
 * The secret is shown as text rather than a QR code. Rendering a QR needs a
 * library, and a pastable otpauth:// link plus a typed secret works in every
 * authenticator — it is the less pretty answer that costs the bundle nothing.
 */
export function MfaSettings() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { data: status, isLoading } = useMfaStatus();

  const begin = useBeginMfaEnrolment();
  const confirm = useConfirmMfaEnrolment();
  const disable = useDisableMfa();

  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(message, 'success');
    } catch {
      showToast(t.common.error, 'error');
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <Spinner label={t.common.loading} />
        </div>
      </Card>
    );
  }

  // Shown once, immediately after enabling. The server stores only hashes, so
  // there is no second chance and the copy has to say so plainly.
  if (recoveryCodes) {
    return (
      <Card className="border-brand-amber-500/40">
        <CardHeader>
          <CardTitle>{t.auth.mfaRecoveryTitle}</CardTitle>
          <CardDescription>{t.auth.mfaRecoveryBody}</CardDescription>
        </CardHeader>

        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-surface-200 p-4 sm:grid-cols-4">
          {recoveryCodes.map((recoveryCode) => (
            <li
              key={recoveryCode}
              className="ltr text-center font-mono text-sm tracking-wider text-text-primary"
            >
              {recoveryCode}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy(recoveryCodes.join('\n'), t.auth.mfaRecoveryCopied)}
          >
            <Copy className="size-4" />
            {t.auth.mfaRecoveryCopy}
          </Button>
          <Button type="button" onClick={() => setRecoveryCodes(null)}>
            {t.auth.mfaRecoveryStored}
          </Button>
        </div>
      </Card>
    );
  }

  if (status?.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t.auth.mfaTitle}{' '}
            <Badge variant="success">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t.auth.mfaOn}
            </Badge>
          </CardTitle>
          <CardDescription>{t.auth.mfaOnBody}</CardDescription>
        </CardHeader>

        {status.recoveryCodesLeft <= 2 && (
          <p className="mb-4 text-sm text-brand-amber-600 dark:text-brand-amber-400">
            {t.auth.mfaRecoveryLow.replace('{count}', String(status.recoveryCodesLeft))}
          </p>
        )}

        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await disable.mutateAsync(code);
              setCode('');
              showToast(t.auth.mfaDisabled, 'success');
            } catch (err) {
              setError(apiMessage(err, t.auth.mfaCodeWrong));
            }
          }}
        >
          {/* Turning it off needs a current code, not just this session —
              otherwise an unlocked laptop removes the control that exists for
              exactly that situation. */}
          <FormField label={t.auth.mfaDisableLabel} htmlFor="mfa-disable" error={error ?? undefined}>
            <Input
              id="mfa-disable"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              className="ltr text-start font-mono tracking-widest"
            />
          </FormField>
          <Button type="submit" variant="outline" isLoading={disable.isPending} className="w-fit">
            <ShieldOff className="size-4" />
            {t.auth.mfaDisable}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.mfaTitle}</CardTitle>
        <CardDescription>{t.auth.mfaOffBody}</CardDescription>
      </CardHeader>

      {!secret ? (
        <Button
          type="button"
          isLoading={begin.isPending}
          className="w-fit"
          onClick={async () => {
            setError(null);
            try {
              const enrolment = await begin.mutateAsync();
              setSecret(enrolment.secret);
              setOtpauth(enrolment.otpauthUri);
            } catch (err) {
              setError(apiMessage(err, t.common.error));
            }
          }}
        >
          <ShieldCheck className="size-4" />
          {t.auth.mfaEnable}
        </Button>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-text-secondary">{t.auth.mfaStep1}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="ltr select-all break-all rounded-lg bg-surface-200 px-3 py-2 font-mono text-sm tracking-wider text-text-primary">
                {secret}
              </code>
              <Button
                type="button"
                variant="ghost"
                onClick={() => copy(secret, t.auth.mfaSecretCopied)}
              >
                <Copy className="size-4" />
                {t.auth.mfaCopyKey}
              </Button>
            </div>
            {otpauth && (
              <a
                href={otpauth}
                className="mt-2 inline-block text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
              >
                {t.auth.mfaOpenInApp}
              </a>
            )}
          </div>

          <form
            className="flex flex-col gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              try {
                const codes = await confirm.mutateAsync(code);
                setRecoveryCodes(codes);
                setSecret(null);
                setOtpauth(null);
                setCode('');
              } catch (err) {
                setError(apiMessage(err, t.auth.mfaCodeWrong));
              }
            }}
          >
            <FormField
              label={t.auth.mfaStep2}
              htmlFor="mfa-confirm"
              hint={t.auth.mfaCodeHint}
              error={error ?? undefined}
            >
              <Input
                id="mfa-confirm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                className="ltr text-start font-mono tracking-[0.4em]"
              />
            </FormField>
            <Button type="submit" isLoading={confirm.isPending} className="w-fit">
              {t.auth.mfaConfirm}
            </Button>
          </form>
        </div>
      )}

      {error && !secret && (
        <p role="alert" className="mt-3 text-sm text-brand-red-500">
          {error}
        </p>
      )}
    </Card>
  );
}
