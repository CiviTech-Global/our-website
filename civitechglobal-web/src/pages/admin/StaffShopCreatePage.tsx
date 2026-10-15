import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, Store, UserRound, X } from 'lucide-react';
import { useBusinessCategories, useShopOwnerSearch, useStaffCreateShop, type ShopOwnerOption } from '@/api/trademaster';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { EMPTY_SHOP, shopPayload, validateShop, type FieldErrors, type ShopDraft } from '@/lib/marketForms';
import { diagnoseUpload, logUploadFailure } from '@/lib/uploadError';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { ShopFormFields } from '@/components/trademaster/ShopFormFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';

/**
 * The market desk opens a shop.
 *
 * For a member who came to the company rather than to the site, or for the
 * company's own counter. Same form as a seller's, same validation; two
 * differences, both the desk's to decide: whose shop it is, and whether it goes
 * live now — recorded as approved by this staff member — or waits as a draft in
 * the owner's dashboard. Products are added from that dashboard either way, by
 * the owner (or by staff, for a shop of their own).
 */
export default function StaffShopCreatePage() {
  const { t } = useLocale();
  const desk = t.trademaster.desk;
  const hub = t.trademaster.hub;
  useDocumentTitle(desk.openShop);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: businessCategories } = useBusinessCategories();
  const create = useStaffCreateShop();

  const [ownerMode, setOwnerMode] = useState<'self' | 'member'>('member');
  const [owner, setOwner] = useState<ShopOwnerOption | null>(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerError, setOwnerError] = useState(false);
  const owners = useShopOwnerSearch(owner ? '' : ownerQuery);
  const [publish, setPublish] = useState(true);

  const [draft, setDraft] = useState<ShopDraft>(EMPTY_SHOP);
  const [errors, setErrors] = useState<FieldErrors<keyof ShopDraft>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [logoState, setLogoState] = useState<UploadState>(IDLE);
  const [coverState, setCoverState] = useState<UploadState>(IDLE);

  const set = useCallback(
    (name: keyof ShopDraft) => (value: string) => {
      setDraft((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    },
    []
  );

  async function handleSave(event?: FormEvent) {
    event?.preventDefault();
    const found = validateShop(draft);
    setErrors(found);
    const missingOwner = ownerMode === 'member' && !owner;
    setOwnerError(missingOwner);
    if (Object.keys(found).length > 0 || missingOwner) {
      showToast(missingOwner ? desk.ownerRequired : hub.fixErrors, 'error');
      return;
    }

    const onProgress = (percent: number) => {
      const phase = percent >= 100 ? 'finishing' : 'uploading';
      if (logo) setLogoState((prev) => ({ ...prev, phase, percent, file: logo }));
      if (cover) setCoverState((prev) => ({ ...prev, phase, percent, file: cover }));
    };
    if (logo) setLogoState({ phase: 'uploading', percent: 0, file: logo });
    if (cover) setCoverState({ phase: 'uploading', percent: 0, file: cover });

    try {
      await create.mutateAsync({
        payload: {
          ...shopPayload(draft, false),
          ...(ownerMode === 'member' && owner ? { ownerId: owner.id } : {}),
          publish,
        },
        logo: logo ?? undefined,
        cover: cover ?? undefined,
        onProgress,
      });
      showToast(publish ? desk.created : desk.createdDraft, 'success');
      navigate('/admin/trademaster/shops');
    } catch (error) {
      const diagnosis = diagnoseUpload(error, t, logo ?? cover);
      logUploadFailure('staff-shop', diagnosis, error);
      if (logo) setLogoState({ phase: 'error', percent: 0, file: logo, error: diagnosis });
      if (cover) setCoverState({ phase: 'error', percent: 0, file: cover, error: diagnosis });
      showToast(diagnosis.message, 'error');
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
        title={desk.openShop}
        description={desk.openShopSubtitle}
        actions={
          <Link to="/admin/trademaster/shops">
            <Button variant="ghost">{t.common.cancel}</Button>
          </Link>
        }
      />

      <form onSubmit={(event) => void handleSave(event)} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title={t.trademaster.newShop} className="order-2 lg:order-1">
          <div className="flex flex-col gap-4">
            <ShopFormFields
              idPrefix="desk-shop"
              draft={draft}
              errors={errors}
              onField={set}
              businessCategories={businessCategories}
              logo={{ file: logo, onChange: (file) => { setLogo(file); setLogoState(IDLE); }, uploadState: logoState, previewPath: null }}
              cover={{ file: cover, onChange: (file) => { setCover(file); setCoverState(IDLE); }, uploadState: coverState, previewPath: null }}
              onRetryUpload={() => void handleSave()}
            />
          </div>
        </Panel>

        {/* The two decisions only the desk makes, kept beside the form and in
            view, since they decide what the rest of it means. */}
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
                      <ul className="flex flex-col gap-1">
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

          <Panel title={desk.publishNow}>
            <label className="flex items-start gap-3 text-body text-app-text-2">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-app-border-strong"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
              />
              <span>{desk.publishHint}</span>
            </label>
            <p className="mt-3 text-label text-app-text-3">{desk.manageHint}</p>
          </Panel>

          <Button type="submit" size="lg" isLoading={create.isPending}>
            <Store className="size-4" aria-hidden="true" />
            {desk.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
