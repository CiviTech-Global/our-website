import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useOwnShops } from '@/api/trademaster';
import { features } from '@/lib/features';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';

/**
 * Who a new job or project is posted as: the person, or one of their live
 * shops. It decides which plan the post counts against — a shop's posts come
 * from the Business plan — and whose name the post carries.
 *
 * Shown only to somebody with a live shop. A company account always posts as
 * its company, so it never sees the choice.
 */
export function PostAsSelect({ value, onChange }: { value: string; onChange: (businessId: string) => void }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const isCompany = user?.accountKind === 'COMPANY';
  const { data: shops } = useOwnShops(features.tradeMaster && !isCompany);
  const live = (shops ?? []).filter((shop) => shop.moderationStatus === 'APPROVED' && shop.state === 'OPEN');

  if (isCompany || live.length === 0) return null;

  return (
    <FormField label={t.plans.postAs} htmlFor="post-as" hint={t.plans.postAsHint}>
      <Select id="post-as" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t.plans.postAsMe}</option>
        {live.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
}
