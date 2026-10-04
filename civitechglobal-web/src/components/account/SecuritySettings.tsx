import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { useChangePassword } from '@/api/workspace';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

/**
 * The password, changed from inside the account. The rules are the server's;
 * this checks only that the two new copies agree, which is the one thing the
 * server cannot. Signing out everywhere has its own card on the same page.
 */
export function SecuritySettings() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const mismatch = repeat.length > 0 && next !== repeat;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== repeat) return;
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setRepeat('');
      showToast(t.workspace.passwordChanged, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.workspace.securityTitle}</CardTitle>
        <CardDescription>{t.workspace.securityHint}</CardDescription>
      </CardHeader>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label={t.workspace.currentPassword} htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.workspace.newPassword} htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </FormField>
          <FormField
            label={t.workspace.confirmPassword}
            htmlFor="repeat-password"
            error={mismatch ? t.workspace.passwordMismatch : undefined}
          >
            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              required
              invalid={mismatch}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </FormField>
        </div>
        <Button type="submit" className="w-fit" isLoading={change.isPending} disabled={mismatch}>
          <KeyRound className="size-4" aria-hidden="true" />
          {t.workspace.changePassword}
        </Button>
      </form>
    </Card>
  );
}
