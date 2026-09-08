import { useMemo, useState } from 'react';
import { ApiError } from '@/config/api';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useSubmitInsuranceRequest } from '@/api/insurance';
import { Button } from '@/components/ui/Button';
import { DynamicField } from './DynamicField';
import { PhoneVerification } from './PhoneVerification';
import { useLocale } from '@/i18n/LocaleProvider';
import {
  buildPayload,
  splitIntoSteps,
  validateAll,
  validateField,
  visibleFields,
  type FieldErrors,
} from '@/lib/insuranceForm';
import type { Answers, AnswerValue, ProductDetail, SubmitResult } from '@/types/insurance';

interface InsuranceFormProps {
  product: ProductDetail;
  onSubmitted: (result: SubmitResult) => void;
}

interface ServerFieldError {
  path: string;
  message: string;
}

/**
 * The per-product form.
 *
 * Every input, rule and step boundary is derived from `product.formSchema`,
 * which the server built from the catalog. Adding a question to a product is a
 * change in one file on the server; this component does not know or care what
 * insurance it is rendering.
 */
export function InsuranceForm({ product, onSubmitted }: InsuranceFormProps) {
  const { t, locale, dir } = useLocale();
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = useSubmitInsuranceRequest();

  const steps = useMemo(() => splitIntoSteps(product.formSchema), [product.formSchema]);
  const step = steps[stepIndex]!;
  const isLastStep = stepIndex === steps.length - 1;

  // Only fields whose conditions currently hold — recomputed on every answer so
  // a dependent input appears the moment its trigger is chosen.
  const fieldsToRender = visibleFields(step.fields, answers);

  function setAnswer(name: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [name]: value }));
    // Clear the error as soon as the value changes; re-validated on blur. An
    // error that persists while you are fixing it reads as if nothing helped.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleBlur(name: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const field = step.fields.find((f) => f.name === name);
    if (!field) return;
    const message = validateField(field, answers[name]);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }

  function validateCurrentStep(): boolean {
    const stepErrors = validateAll(step.fields, answers);
    setErrors(stepErrors);
    setTouched((prev) => ({
      ...prev,
      ...Object.fromEntries(fieldsToRender.map((f) => [f.name, true])),
    }));
    return Object.keys(stepErrors).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (!validateCurrentStep()) return;
    if (!phoneToken) {
      setSubmitError(t.insurance.verifyPhoneFirst);
      return;
    }

    try {
      const result = await submit.mutateAsync({
        productSlug: product.slug,
        phoneToken,
        answers: buildPayload(product.formSchema, answers),
      });
      onSubmitted(result);
    } catch (error) {
      if (error instanceof ApiError) {
        const data = error.response?.data as
          | { message?: string; errors?: ServerFieldError[] }
          | undefined;

        // The server validates the same field list; surfacing its per-field
        // messages beats a generic banner when the two disagree about an edge
        // case, which is exactly when the user needs to know which input.
        if (data?.errors?.length) {
          setErrors(Object.fromEntries(data.errors.map((e) => [e.path, e.message])));
          const firstBadStep = steps.findIndex((s) =>
            s.fields.some((f) => data.errors!.some((e) => e.path === f.name)),
          );
          if (firstBadStep >= 0 && firstBadStep !== stepIndex) setStepIndex(firstBadStep);
        }
        setSubmitError(data?.message ?? t.insurance.submitFailed);
        return;
      }
      setSubmitError(t.insurance.submitFailed);
    }
  }

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const NextIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {steps.length > 1 && (
        <ol className="flex items-center gap-2" aria-label={t.insurance.steps}>
          {steps.map((s, i) => (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span
                className={
                  i <= stepIndex
                    ? 'h-1.5 w-full rounded-full bg-brand-green-500'
                    : 'h-1.5 w-full rounded-full bg-surface-300'
                }
                aria-current={i === stepIndex ? 'step' : undefined}
              />
            </li>
          ))}
        </ol>
      )}

      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          {step.key === 'contact' ? t.insurance.stepContact : t.insurance.stepDetails}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {step.key === 'contact' ? t.insurance.stepContactHint : t.insurance.stepDetailsHint}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fieldsToRender.map((field) => (
          <div
            key={field.name}
            // Long-form inputs and option chip-sets read badly at half width.
            className={
              field.type === 'textarea' || field.type === 'multiselect' ? 'sm:col-span-2' : undefined
            }
          >
            <DynamicField
              field={field}
              value={answers[field.name]}
              error={touched[field.name] ? errors[field.name] : undefined}
              onChange={(value) => setAnswer(field.name, value)}
              onBlur={() => handleBlur(field.name)}
            />
          </div>
        ))}
      </div>

      {isLastStep && (
        <PhoneVerification
          verifiedPhone={phone}
          onVerified={(verifiedPhone, token) => {
            setPhone(verifiedPhone);
            setPhoneToken(token);
            setSubmitError(null);
          }}
        />
      )}

      {submitError && (
        <p className="rounded-xl border border-brand-red-500/40 bg-brand-red-500/5 p-3 text-sm text-brand-red-500" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {stepIndex > 0 && (
          <Button type="button" variant="outline" onClick={goBack}>
            <BackIcon className="size-4" />
            {t.common.previous}
          </Button>
        )}

        {isLastStep ? (
          <Button type="submit" isLoading={submit.isPending} disabled={!phoneToken}>
            <Send className="size-4" />
            {product.intakeMode === 'CALLBACK'
              ? t.insurance.submitCallback
              : t.insurance.submitRequest}
          </Button>
        ) : (
          <Button type="button" onClick={goNext}>
            {t.common.next}
            <NextIcon className="size-4" />
          </Button>
        )}

        <p className="text-xs text-text-muted">
          {locale === 'fa'
            ? `مرحله ${stepIndex + 1} از ${steps.length}`
            : `Step ${stepIndex + 1} of ${steps.length}`}
        </p>
      </div>
    </form>
  );
}
