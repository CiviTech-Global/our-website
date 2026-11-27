import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, UserRound, Wrench, X } from 'lucide-react';
import { useServiceOwnerSearch, useStaffCreateService, useWorkCategories, type ServiceOwnerOption } from '@/api/work';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { CurrencySelect } from '@/components/jobs/GeoFields';
import { WorkCategorySelect } from '@/components/work/WorkUi';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { UNLIMITED_REVISIONS } from '@/types/work';

const digits = (value: string) => toLatinDigits(value).replace(/[^0-9]/g, '');

/**
 * The freelance desk opens a service.
 *
 * For a member who came to the company rather than to the site, or for the
 * company's own counter. Deliberately the essentials only — the title, the
 * description, a category and one Basic package; the owner finishes the rest
 * (gallery, more packages, extras, FAQs) in their own editor and submits it,
 * where the usual review applies.
 */
export default function StaffServiceCreatePage() {
  const { t } = useLocale();
  const work = t.work;
  const desk = t.trademaster.desk;
  useDocumentTitle(work.deskCreateService);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: categories } = useWorkCategories();
  const create = useStaffCreateService();

  const [ownerMode, setOwnerMode] = useState<'self' | 'member'>('member');
  const [owner, setOwner] = useState<ServiceOwnerOption | null>(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerError, setOwnerError] = useState(false);
  const owners = useServiceOwnerSearch(owner ? '' : ownerQuery);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workCategoryId, setWorkCategoryId] = useState('');
  const [currency, setCurrency] = useState('IRT');
  const [pkg, setPkg] = useState({ name: '', description: '', price: '', deliveryDays: '3', revisions: '1' });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const missingOwner = ownerMode === 'member' && !owner;
    setOwnerError(missingOwner);
    if (missingOwner) {
      showToast(desk.ownerRequired, 'error');
      return;
    }

    try {
      await create.mutateAsync({
        payload: {
          title: title.trim(),
          description: description.trim(),
          workCategoryId: workCategoryId || null,
          skills: [],
          languages: ['fa'],
          faqs: [],
          requirements: [],
          currency,
          packages: [
            {
              tier: 'BASIC',
              name: pkg.name.trim(),
              description: pkg.description.trim(),
              price: digits(pkg.price),
              deliveryDays: Number(digits(pkg.deliveryDays)) || 1,
              revisions: Number(digits(pkg.revisions)),
              features: [],
            },
          ],
          extras: [],
          ...(ownerMode === 'member' && owner ? { ownerId: owner.id } : {}),
        },
        images: [],
      });
      showToast(work.deskServiceCreated, 'success');
      navigate('/admin/services-queue');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const choice = (mode: 'self' | 'member', label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={ownerMode === mode}
      onClick={() => {
        setOwnerMode(mode);
        setOwnerError(false);
      }}
      className={cn(
        'flex-1 rounded-[var(--radius-control)] border px-3 py-2.5 text-start text-body transition-colors',
        ownerMode === mode
          ? 'border-app-primary bg-app-primary-soft font-semibold text-app-text'
          : 'border-app-border text-app-text-2 hover:border-app-border-strong'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={work.deskCreateService}
        description={work.deskCreateServiceSubtitle}
        actions={
          <Link to="/admin/services-queue">
            <Button variant="ghost">{t.common.cancel}</Button>
          </Link>
        }
      />

      <form onSubmit={(event) => void handleSave(event)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title={work.aboutService} className="order-2 lg:order-1">
          <div className="flex flex-col gap-4">
            <FormField label={work.serviceTitleLabel} htmlFor="desk-s-title" hint={work.serviceTitleHint}>
              <Input id="desk-s-title" required minLength={15} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            <FormField label={work.categoryLabel} htmlFor="desk-s-category">
              <WorkCategorySelect
                id="desk-s-category"
                categories={categories}
                value={workCategoryId}
                onChange={(value) => setWorkCategoryId(value)}
                placeholder={work.chooseCategory}
              />
            </FormField>
            <FormField label={work.serviceDescriptionLabel} htmlFor="desk-s-description">
              <TextArea
                id="desk-s-description"
                required
                minLength={120}
                maxLength={12_000}
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <fieldset className="flex flex-col gap-3 rounded-xl border border-app-border p-3">
              <legend className="px-1 font-semibold text-app-text">{work.tiers.BASIC}</legend>
              <CurrencySelect className="w-40" aria-label={work.currencyLabel} value={currency} onChange={(value) => setCurrency(value)} />
              <Input
                aria-label={work.packageName}
                placeholder={work.packageName}
                required
                maxLength={60}
                value={pkg.name}
                onChange={(e) => setPkg({ ...pkg, name: e.target.value })}
              />
              <TextArea
                aria-label={work.packageDescription}
                placeholder={work.packageDescription}
                required
                rows={3}
                maxLength={600}
                value={pkg.description}
                onChange={(e) => setPkg({ ...pkg, description: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <FormField label={work.packagePrice} htmlFor="desk-pkg-price">
                  <Input
                    id="desk-pkg-price"
                    required
                    inputMode="numeric"
                    className="ltr"
                    value={pkg.price}
                    onChange={(e) => setPkg({ ...pkg, price: e.target.value })}
                  />
                </FormField>
                <FormField label={work.packageDays} htmlFor="desk-pkg-days">
                  <Input
                    id="desk-pkg-days"
                    required
                    type="number"
                    min={1}
                    max={365}
                    className="ltr"
                    value={pkg.deliveryDays}
                    onChange={(e) => setPkg({ ...pkg, deliveryDays: e.target.value })}
                  />
                </FormField>
                <FormField label={work.packageRevisions} htmlFor="desk-pkg-revisions">
                  <select
                    id="desk-pkg-revisions"
                    className="w-full rounded-lg border border-app-border bg-app-surface-1 px-2 py-2 text-sm"
                    value={pkg.revisions}
                    onChange={(e) => setPkg({ ...pkg, revisions: e.target.value })}
                  >
                    {[0, 1, 2, 3, 5, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value={UNLIMITED_REVISIONS}>{work.unlimitedRevisions}</option>
                  </select>
                </FormField>
              </div>
            </fieldset>

            <p className="text-label text-app-text-3">{work.deskServiceHint}</p>
          </div>
        </Panel>

        <div className="order-1 flex flex-col gap-4 lg:sticky lg:top-0 lg:order-2 lg:self-start">
          <Panel title={desk.ownerLegend}>
            <div className="flex flex-col gap-3">
              <div role="radiogroup" aria-label={desk.ownerLegend} className="flex gap-2">
                {choice('member', desk.ownerMember)}
                {choice('self', desk.ownerSelf)}
              </div>

              {ownerMode === 'self' && user && (
                <p className="flex items-center gap-2 text-body text-app-text-2">
                  <UserRound className="size-4 text-app-icon" aria-hidden="true" />
                  {user.firstName} {user.lastName}
                </p>
              )}

              {ownerMode === 'member' &&
                (owner ? (
                  <div className="flex items-start justify-between gap-2 rounded-[var(--radius-control)] border border-app-primary bg-app-primary-soft p-3">
                    <div className="min-w-0">
                      <p className="text-label text-app-text-3">{desk.ownerChosen}</p>
                      <p className="truncate font-semibold text-app-text">
                        {owner.firstName} {owner.lastName}
                      </p>
                      <p className="truncate text-label text-app-text-3" dir="ltr">
                        {owner.email}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOwner(null)} aria-label={desk.ownerChange}>
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="relative">
                      <span className="sr-only">{desk.ownerSearch}</span>
                      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-app-icon" aria-hidden="true" />
                      <Input
                        value={ownerQuery}
                        onChange={(e) => {
                          setOwnerQuery(e.target.value);
                          setOwnerError(false);
                        }}
                        placeholder={desk.ownerSearch}
                        invalid={ownerError}
                        className="ps-9"
                        maxLength={80}
                      />
                    </label>
                    {ownerError && (
                      <p className="text-label text-status-error" role="alert">
                        {desk.ownerRequired}
                      </p>
                    )}
                    {owners.isFetching && <Spinner label={t.common.loading} />}
                    {owners.data && owners.data.length === 0 && <p className="text-label text-app-text-3">{desk.ownerNone}</p>}
                    {owners.data && owners.data.length > 0 && (
                      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                        {owners.data.map((option) => (
                          <li key={option.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setOwner(option);
                                setOwnerError(false);
                              }}
                              className="flex w-full flex-col rounded-[var(--radius-control)] px-3 py-2 text-start hover:bg-app-hover"
                            >
                              <span className="font-medium text-app-text">
                                {option.firstName} {option.lastName}
                              </span>
                              <span className="truncate text-label text-app-text-3" dir="ltr">
                                {option.email}
                                {option.username ? ` · @${option.username}` : ''}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
            </div>
          </Panel>

          <Button type="submit" size="lg" isLoading={create.isPending}>
            <Wrench className="size-4" aria-hidden="true" />
            {work.deskCreateService}
          </Button>
        </div>
      </form>
    </div>
  );
}
