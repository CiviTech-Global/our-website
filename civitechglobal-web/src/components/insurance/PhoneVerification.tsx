import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/config/api';
import { Check, CheckCircle2, Copy, Phone, ShieldCheck } from 'lucide-react';
import { useSendOtp, useVerifyOtp } from '@/api/insurance';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { normalizeIranMobile, normalizePersianDigits } from '@/lib/persian';
import { useLocale } from '@/i18n/LocaleProvider';

interface PhoneVerificationProps {
  /** Called once the number is proved; the token is what authorises submission. */
  onVerified: (phone: string, phoneToken: string) => void;
  verifiedPhone: string | null;
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

/**
 * Proves the applicant controls the number before the request is accepted.
 *
 * The number is the one field that has to be true — it is what a specialist
 * calls back on, and a public form without this check fills the queue with
 * typos and nonsense. Ten seconds of friction removes both problems, which is
 * why it sits in front of submission rather than after it.
 */
export function PhoneVerification({ onVerified, verifiedPhone }: PhoneVerificationProps) {
  const { t, locale } = useLocale();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // TEMPORARY — remove together with `devCode` in otp.service.ts once an SMS
  // gateway is bought. Until then the code has nowhere to go but the screen.
  const [devCode, setDevCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  if (verifiedPhone) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-green-500/40 bg-brand-green-500/5 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-brand-green-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">{t.insurance.phoneVerified}</p>
          <p className="ltr text-start text-sm text-text-secondary">{verifiedPhone}</p>
        </div>
      </div>
    );
  }

  async function handleSend() {
    setError(null);
    const normalized = normalizeIranMobile(phone);
    if (!normalized) {
      setError(t.insurance.phoneInvalid);
      return;
    }

    try {
      const result = await sendOtp.mutateAsync(normalized);
      setSent(true);
      setSecondsLeft(60);
      // TEMPORARY. With no SMS gateway connected the API returns the code in
      // the response (outside production only). Showing it in a dialog keeps
      // the rest of the flow honest — it still has to be typed or pasted into
      // the field, exactly as a texted code would be.
      if (result.devCode) {
        setDevCode(result.devCode);
        setCopied(false);
      } else {
        window.setTimeout(() => codeInputRef.current?.focus(), 50);
      }
    } catch (err) {
      setError(messageFrom(err, t.insurance.otpSendFailed));
    }
  }

  async function handleVerify() {
    setError(null);
    const normalized = normalizeIranMobile(phone);
    if (!normalized) {
      setError(t.insurance.phoneInvalid);
      return;
    }

    try {
      const result = await verifyOtp.mutateAsync({ phone: normalized, code });
      onVerified(normalized, result.phoneToken);
    } catch (err) {
      setError(messageFrom(err, t.insurance.otpVerifyFailed));
    }
  }

  async function copyDevCode() {
    if (!devCode) return;
    try {
      await navigator.clipboard.writeText(devCode);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // The code is on screen either way, so this is not worth an error.
      setCopied(false);
    }
  }

  function closeDevCode() {
    setDevCode(null);
    window.setTimeout(() => codeInputRef.current?.focus(), 50);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-green-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">{t.insurance.verifyPhoneTitle}</p>
          <p className="mt-1 text-xs text-text-secondary">{t.insurance.verifyPhoneHint}</p>
        </div>
      </div>

      <FormField label={t.insurance.phoneLabel} htmlFor="insurance-phone">
        <div className="flex gap-2">
          <Input
            id="insurance-phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="09121234567"
            value={phone}
            disabled={sent}
            onChange={(e) => setPhone(normalizePersianDigits(e.target.value))}
            className="ltr text-start"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleSend}
            isLoading={sendOtp.isPending}
            disabled={sent && secondsLeft > 0}
            className="shrink-0"
          >
            <Phone className="size-4" />
            {sent && secondsLeft > 0
              ? `${secondsLeft}${locale === 'fa' ? ' ثانیه' : 's'}`
              : sent
                ? t.insurance.resendCode
                : t.insurance.sendCode}
          </Button>
        </div>
      </FormField>

      {sent && (
        <FormField label={t.insurance.codeLabel} htmlFor="insurance-code">
          <div className="flex gap-2">
            <Input
              id="insurance-code"
              ref={codeInputRef}
              inputMode="numeric"
              maxLength={6}
              dir="ltr"
              placeholder="------"
              value={code}
              onChange={(e) => setCode(normalizePersianDigits(e.target.value).replace(/\D/g, ''))}
              className="ltr text-start tracking-[0.4em]"
            />
            <Button
              type="button"
              onClick={handleVerify}
              isLoading={verifyOtp.isPending}
              disabled={code.length !== 6}
              className="shrink-0"
            >
              {t.insurance.verifyCode}
            </Button>
          </div>
        </FormField>
      )}

      {error && (
        <p className="text-xs text-brand-red-500" role="alert">
          {error}
        </p>
      )}

      {/* TEMPORARY: stands in for an SMS until a gateway is configured. */}
      <Modal isOpen={devCode !== null} onClose={closeDevCode} title={t.insurance.devCodeTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">{t.insurance.devCodeHint}</p>
          <p
            dir="ltr"
            className="ltr rounded-xl border border-border-default bg-surface-100 py-4 text-center text-3xl font-semibold tracking-[0.5em] text-text-primary"
          >
            {devCode}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={copyDevCode} className="flex-1">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t.insurance.devCodeCopied : t.insurance.devCodeCopy}
            </Button>
            <Button type="button" onClick={closeDevCode} className="flex-1">
              {t.insurance.devCodeClose}
            </Button>
          </div>
        </div>
      </Modal>

      <button
        type="button"
        onClick={() => {
          setSent(false);
          setCode('');
          setSecondsLeft(0);
          setError(null);
        }}
        className={sent ? 'text-start text-xs text-text-muted underline' : 'hidden'}
      >
        {t.insurance.changeNumber}
      </button>
    </div>
  );
}
