import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { count, fill } from '@/lib/planFormat';
import { formatMoney } from '@/lib/marketplace';
import { useSmsReport } from '@/api/sms';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_VARIANT = { SENT: 'success', FAILED: 'danger', SKIPPED: 'default' } as const;

/**
 * Staff: what texts have cost, per kind, and the latest sends with the reason
 * any was not sent. Numbers are never shown — the log keeps only hashes.
 */
export default function AdminSmsPage() {
  const { t, locale } = useLocale();
  const s = t.sms;
  useDocumentTitle(s.adminTitle);
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSmsReport(days);
  const kindName = (kind: string) => (s.kinds as Record<string, string | undefined>)[kind] ?? kind;
  const rials = (value: number) => formatMoney(String(value), locale) ?? count(value, locale);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={s.adminTitle} description={s.adminIntro} className="mb-0" />

      {isLoading && <Spinner label={t.common.loading} />}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {s.provider}: <span dir="ltr">{data.provider}</span>
            </Badge>
            <Badge variant={data.canSend ? 'success' : 'warning'}>{data.canSend ? s.canSendYes : s.canSendNo}</Badge>
            <Badge variant={data.memberAlerts ? 'success' : 'default'}>{data.memberAlerts ? s.memberAlertsOn : s.memberAlertsOff}</Badge>
            <Badge>{fill(s.dailyCap, { count: count(data.dailyCap, locale) })}</Badge>
            <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-32" aria-label={s.when}>
              {[7, 30, 90, 365].map((value) => (
                <option key={value} value={value}>
                  {count(value, locale)}
                </option>
              ))}
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{fill(s.totalCost, { days: count(data.days, locale), amount: rials(data.totalCostRials) })}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-body">
                <thead>
                  <tr className="border-b border-app-border text-label text-app-text-3">
                    <th className="p-2 text-start">{s.kind}</th>
                    <th className="p-2 text-start">{s.template}</th>
                    <th className="p-2 text-start">{s.sent}</th>
                    <th className="p-2 text-start">{s.failed}</th>
                    <th className="p-2 text-start">{s.skipped}</th>
                    <th className="p-2 text-start">{s.costRials}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kinds.map((row) => (
                    <tr key={row.kind} className="border-b border-app-border last:border-0">
                      <td className="p-2 text-app-text">{kindName(row.kind)}</td>
                      <td className="p-2 text-app-text-3" dir="ltr">
                        {row.template}
                      </td>
                      <td className="p-2">{count(row.sent, locale)}</td>
                      <td className="p-2">{count(row.failed, locale)}</td>
                      <td className="p-2">{count(row.skipped, locale)}</td>
                      <td className="p-2">{rials(row.costRials)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{s.recent}</CardTitle>
            </CardHeader>
            <ul className="flex flex-col divide-y divide-app-border">
              {data.recent.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-body text-app-text">{kindName(row.kind)}</p>
                    <p className="text-label text-app-text-4">
                      {formatDate(row.createdAt, locale)}
                      {row.cost !== null && ` · ${rials(row.cost)}`}
                      {row.reason && ` · ${s.reason}: ${row.reason}`}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[row.status]}>{s.statuses[row.status]}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
