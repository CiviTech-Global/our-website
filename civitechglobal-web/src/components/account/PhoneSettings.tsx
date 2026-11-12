import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import { fill } from '@/lib/planFormat';
import { toLatinDigits } from '@/i18n/utils';
import { useConfirmPhoneCode, usePhoneSettings, useRequestPhoneCode, useSetSmsOptOut } from '@/api/sms';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

/**
 * The account's mobile number: proved with a texted code, then used for
 * password reset by SMS and security alerts. Changing the number un-verifies
 * it on the server, so the card simply asks for a new code.
 */
export function PhoneSettings() {
  const { t } = useLocale();
  const s = t.sms;
  const { showToast } = useToast();
  const { data } = usePhoneSettings();
  const requestCode = useRequestPhoneCode();
  const confirm = useConfirmPhoneCode();
  const optOut = useSetSmsOptOut();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (data) setPhone(data.phone ?? data.suggestedPhone ?? '');
  }, [data]);

  if (!data) return null;
  const verified = Boolean(data.phoneVerifiedAt) && !editing;

  async function send() {
    try {
      await requestCode.mutateAsync(phone);
      setAwaitingCode(true);
      showToast(fill(s.codeSent, { phone }), 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function verify() {
    try {
      // A Persian keyboard types Persian digits; the server reads Latin ones.
      await confirm.mutateAsync(toLatinDigits(code));
      setAwaitingCode(false);
      setEditing(false);
      setCode('');
      showToast(s.phoneVerified, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {s.phoneTitle}
          <Badge variant={verified ? 'success' : 'default'}>{verified ? s.verified : s.notVerified}</Badge>
        </CardTitle>
        <CardDescription>{s.phoneIntro}</CardDescription>
      </CardHeader>

      {!data.smsAvailable && <p className="text-body text-app-text-4">{s.smsUnavailable}</p>}

      {data.smsAvailable && verified && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-body text-app-text" dir="ltr">
            <CheckCircle2 className="size-4 text-brand-green-600" aria-hidden="true" />
            {data.phone}
          </span>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {s.changeNumber}
          </Button>
        </div>
      )}

      {data.smsAvailable && !verified && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <FormField label={s.phoneLabel} htmlFor="account-phone">
              <Input
                id="account-phone"
                type="tel"
                dir="ltr"
                className="ltr w-56 text-start"
                placeholder="09xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <Button variant="outline" onClick={() => void send()} isLoading={requestCode.isPending} disabled={!phone.trim()}>
              {s.sendCode}
            </Button>
          </div>
          {awaitingCode && (
            <div className="flex flex-wrap items-end gap-2">
              <FormField label={s.codeLabel} htmlFor="account-phone-code">
                <Input
                  id="account-phone-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  className="ltr w-40 text-start"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d۰-۹]/g, ''))}
                />
              </FormField>
              <Button onClick={() => void verify()} isLoading={confirm.isPending} disabled={code.length < 4}>
                {s.confirm}
              </Button>
            </div>
          )}
        </div>
      )}

      {data.smsAvailable && data.phoneVerifiedAt && (
        <label className="mt-4 flex items-start gap-2 text-body text-app-text">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={data.smsOptOut}
            onChange={(e) =>
              void optOut
                .mutateAsync(e.target.checked)
                .then(() => showToast(s.saved, 'success'))
                .catch((error: unknown) => showToast(apiMessage(error, t.common.error), 'error'))
            }
          />
          <span>
            {s.optOutLabel}
            <span className="block text-label text-app-text-4">{s.optOutHint}</span>
          </span>
        </label>
      )}
    </Card>
  );
}
