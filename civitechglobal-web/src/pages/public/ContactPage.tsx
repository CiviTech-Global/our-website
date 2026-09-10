import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Send } from 'lucide-react';
import { api } from '@/config/api';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

const CONTACT_EMAIL = 'info@civitechglobal.com';

/**
 * Registered company details.
 *
 * `null` means we do not have the value yet and the row renders as pending
 * rather than being quietly dropped — a missing registration number should be
 * visible as an outstanding task, not invisible. Fill these in from the
 * company registration record; do not guess them.
 */
const COMPANY = {
  regNo: null as string | null,
  nationalId: null as string | null,
  address: null as string | null,
  phone: null as string | null,
};

const contactSchema = z.object({
  name: z.string().min(1, 'auth.required'),
  email: z.string().min(1, 'auth.required').email('auth.invalidEmail'),
  message: z.string().min(1, 'auth.required'),
});
type ContactFormValues = z.infer<typeof contactSchema>;

/**
 * The contact form.
 *
 * It posts to the API and the message is stored. It used to open a `mailto:`
 * link instead, which meant an enquiry survived only if the visitor had a mail
 * client configured AND went through with sending it — anything else was lost
 * silently, on both sides.
 */
export default function ContactPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.contact);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactFormValues) {
    try {
      await api.post('/contact', values);
      showToast(t.contact.formSuccess, 'success');
      reset();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8 text-center sm:mb-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.contact.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">{t.contact.subtitle}</p>
      </AnimatedSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <AnimatedSection className="lg:col-span-3">
          <Card glass>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <FormField label={t.contact.formName} htmlFor="name" error={resolveI18nKey(t, errors.name?.message)}>
                <Input id="name" invalid={!!errors.name} {...register('name')} />
              </FormField>
              <FormField label={t.contact.formEmail} htmlFor="email" error={resolveI18nKey(t, errors.email?.message)}>
                <Input id="email" type="email" invalid={!!errors.email} {...register('email')} />
              </FormField>
              <FormField
                label={t.contact.formMessage}
                htmlFor="message"
                error={resolveI18nKey(t, errors.message?.message)}
              >
                <TextArea id="message" invalid={!!errors.message} {...register('message')} />
              </FormField>
              <p className="text-xs text-text-muted">{t.contact.formNote}</p>
              <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-fit">
                <Send className="size-4" />
                {t.contact.formSubmit}
              </Button>
            </form>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.08} className="lg:col-span-2">
          <Card className="h-full">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.contact.infoTitle}</h2>
            <div className="flex flex-col gap-4 text-sm">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 rounded-lg border border-border-default p-3 transition-colors hover:border-brand-green-500/40"
              >
                <Mail className="size-5 text-brand-green-500" aria-hidden="true" />
                <div>
                  <p className="text-text-muted">{t.contact.infoEmail}</p>
                  <p className="font-medium text-text-primary ltr text-start">{CONTACT_EMAIL}</p>
                </div>
              </a>
            </div>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.12} className="lg:col-span-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
              <Building2 className="size-5 text-brand-green-500" aria-hidden="true" />
              {t.contact.companyTitle}
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <CompanyRow label={t.contact.companyLegalNameLabel} value={t.common.legalName} />
              <CompanyRow
                label={t.contact.companyRegNoLabel}
                value={COMPANY.regNo}
                pending={t.contact.companyPending}
              />
              <CompanyRow
                label={t.contact.companyNationalIdLabel}
                value={COMPANY.nationalId}
                pending={t.contact.companyPending}
              />
              <CompanyRow
                label={t.contact.companyPhoneLabel}
                value={COMPANY.phone}
                pending={t.contact.companyPending}
              />
              <CompanyRow
                label={t.contact.companyAddressLabel}
                value={COMPANY.address}
                pending={t.contact.companyPending}
                className="sm:col-span-2"
              />
            </dl>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}

function CompanyRow({
  label,
  value,
  pending,
  className,
}: {
  label: string;
  value: string | null;
  pending?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-text-muted">{label}</dt>
      <dd className={value ? 'font-medium text-text-primary' : 'text-text-muted italic'}>
        {value ?? pending}
      </dd>
    </div>
  );
}
