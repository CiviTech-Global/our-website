import { useId } from 'react';
import { Check } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { formatThousands, normalizePersianDigits } from '@/lib/persian';
import type { AnswerValue, FieldDef } from '@/types/insurance';
import { useLocale } from '@/i18n/LocaleProvider';

interface DynamicFieldProps {
  field: FieldDef;
  value: AnswerValue;
  error?: string;
  onChange: (value: AnswerValue) => void;
  onBlur: () => void;
}

/**
 * Renders one catalog field.
 *
 * Everything about the input — label, bounds, options, help text — comes from
 * the server's field definition, so adding a question to a product is a catalog
 * change and nothing here needs touching. That is the whole point of the
 * indirection; the cost is this one switch, which is worth paying once.
 */
export function DynamicField({ field, value, error, onChange, onBlur }: DynamicFieldProps) {
  const { locale } = useLocale();
  const id = useId();

  const label = locale === 'fa' ? field.label : field.labelEn;
  const help = locale === 'fa' ? field.help : field.helpEn;
  const unit = locale === 'fa' ? field.unit : field.unitEn;

  const labelWithRequired = field.required ? label : `${label} (${locale === 'fa' ? 'اختیاری' : 'optional'})`;

  function renderControl() {
    switch (field.type) {
      case 'textarea':
        return (
          <TextArea
            id={id}
            invalid={!!error}
            value={(value as string) ?? ''}
            maxLength={field.maxLength}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        );

      case 'select':
        return (
          <Select
            id={id}
            invalid={!!error}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            onBlur={onBlur}
          >
            <option value="">{locale === 'fa' ? 'انتخاب کنید' : 'Select…'}</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {locale === 'fa' ? option.label : option.labelEn}
              </option>
            ))}
          </Select>
        );

      case 'multiselect': {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
            {(field.options ?? []).map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(
                      isSelected
                        ? selected.filter((v) => v !== option.value)
                        : [...selected, option.value],
                    );
                    onBlur();
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors',
                    isSelected
                      ? 'border-brand-green-500 bg-brand-green-500/10 text-text-primary'
                      : 'border-border-default text-text-secondary hover:border-brand-green-500/40',
                  )}
                >
                  {isSelected && <Check className="size-3.5" aria-hidden="true" />}
                  {locale === 'fa' ? option.label : option.labelEn}
                </button>
              );
            })}
          </div>
        );
      }

      case 'bool':
        return (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-default bg-surface-50 p-3.5">
            <input
              id={id}
              type="checkbox"
              checked={value === true}
              onChange={(e) => {
                onChange(e.target.checked);
                onBlur();
              }}
              className="size-4 accent-brand-green-500"
            />
            <span className="text-sm text-text-secondary">
              {locale === 'fa' ? 'بله' : 'Yes'}
            </span>
          </label>
        );

      case 'date':
        return (
          <DateField
            id={id}
            value={(value as string) ?? ''}
            min={
              field.min === 'today'
                ? new Date().toISOString().slice(0, 10)
                : typeof field.min === 'string'
                  ? field.min
                  : undefined
            }
            onChange={(next) => {
              onChange(next);
              onBlur?.();
            }}
            invalid={!!error}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <Input
              id={id}
              inputMode="numeric"
              invalid={!!error}
              // Grouped for legibility — an unseparated ۱۲۵۰۰۰۰۰۰ is very easy
              // to get wrong by an order of magnitude, and this field is the
              // one that decides the premium.
              value={formatThousands(String(value ?? ''))}
              onChange={(e) => onChange(normalizePersianDigits(e.target.value).replace(/\D/g, ''))}
              onBlur={onBlur}
              className={cn('ltr text-start', unit && 'pe-20')}
            />
            {unit && (
              <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                {unit}
              </span>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <Input
              id={id}
              inputMode="numeric"
              invalid={!!error}
              value={(value as string | number) ?? ''}
              onChange={(e) => onChange(normalizePersianDigits(e.target.value).replace(/[^\d.]/g, ''))}
              onBlur={onBlur}
              className={cn('ltr text-start', unit && 'pe-20')}
            />
            {unit && (
              <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                {unit}
              </span>
            )}
          </div>
        );

      case 'nationalId':
        return (
          <Input
            id={id}
            inputMode="numeric"
            maxLength={10}
            invalid={!!error}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(normalizePersianDigits(e.target.value).replace(/\D/g, ''))}
            onBlur={onBlur}
            className="ltr text-start tracking-widest"
          />
        );

      case 'phone':
        return (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            invalid={!!error}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="ltr text-start"
          />
        );

      case 'plate':
      case 'text':
      default:
        return (
          <Input
            id={id}
            invalid={!!error}
            maxLength={field.maxLength}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        );
    }
  }

  return (
    <FormField label={labelWithRequired} htmlFor={id} error={error} hint={help}>
      {renderControl()}
    </FormField>
  );
}
