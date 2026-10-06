import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Bell,
  Briefcase,
  FileText,
  Handshake,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import { AppShell } from '@/components/app/AppShell';
import { PageHeader } from '@/components/app/PageHeader';
import { DetailList, Panel } from '@/components/app/Panel';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { StatCard, StatGrid } from '@/components/app/StatCard';
import type { NavModule } from '@/components/app/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ListPager } from '@/components/ui/ListPager';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { TextArea } from '@/components/ui/TextArea';
import { StageTracker } from '@/components/jobs/StageTracker';

/**
 * Every dashboard material on one screen, with sample data.
 *
 * DEVELOPMENT ONLY — the route exists only outside a production build. It is
 * where the dashboard look is judged and checked: the real shell, the real
 * components, no sign-in and no API, so a change to a token or a component can
 * be seen at once in both themes (?theme=dark) and both directions (fa/en).
 */

const modules: NavModule[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <LayoutDashboard />,
    sections: [
      {
        id: 'main',
        items: [
          { to: '/dev/dashboard-kit', label: 'Overview', icon: <LayoutDashboard />, end: true },
          { to: '/dev/dashboard-kit/profile', label: 'Profile', icon: <Settings /> },
          { to: '/dev/dashboard-kit/verify', label: 'Verification', icon: <ShieldCheck /> },
        ],
      },
      {
        id: 'work',
        label: 'Marketplace',
        items: [
          { to: '/dev/dashboard-kit/jobs', label: 'My postings', icon: <Briefcase />, count: 4 },
          { to: '/dev/dashboard-kit/applications', label: 'My applications', icon: <FileText /> },
          { to: '/dev/dashboard-kit/awards', label: 'Collaborations', icon: <Handshake /> },
        ],
      },
    ],
  },
  {
    id: 'market',
    label: 'Marketplace',
    icon: <Store />,
    sections: [{ id: 'main', items: [{ to: '/dev/dashboard-kit/shops', label: 'Shops', icon: <Store />, count: 2 }] }],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: <Inbox />,
    sections: [
      {
        id: 'main',
        items: [
          { to: '/dev/dashboard-kit/messages', label: 'Messages', icon: <MessagesSquare />, count: 3 },
          { to: '/dev/dashboard-kit/notifications', label: 'Notifications', icon: <Bell /> },
        ],
      },
    ],
  },
];

const rows = [
  { id: '1', name: 'Senior React developer', code: 'JB4K2Q', applicants: 18, status: 'APPROVED' },
  { id: '2', name: 'Sales specialist — Qazvin', code: 'JB9X1M', applicants: 6, status: 'PENDING_REVIEW' },
  { id: '3', name: 'Accountant', code: 'JB2T8C', applicants: 0, status: 'CHANGES_REQUESTED' },
  { id: '4', name: 'Product designer', code: 'JB7Y3D', applicants: 11, status: 'APPROVED' },
];

export default function DashboardKitPage() {
  const [params] = useSearchParams();
  const { setTheme } = useTheme();
  const [segment, setSegment] = useState('open');
  const [modal, setModal] = useState(params.get('modal') === '1');

  useEffect(() => {
    const wanted = params.get('theme');
    if (wanted === 'dark' || wanted === 'light') setTheme(wanted);
  }, [params, setTheme]);

  return (
    <AppShell panel="user" modules={modules}>
      <PageHeader
        title="Welcome back, Sara"
        description="Everything waiting on you, across hiring, job search and selling."
        actions={
          <>
            <Button variant="outline">
              <Search /> Find jobs
            </Button>
            <Button>
              <Plus /> Post a job
            </Button>
          </>
        }
        summary={
          <StatGrid columns={5}>
            <StatCard label="Unread" value={7} icon={MessagesSquare} to="#" tone="attention" hint="3 messages" />
            <StatCard label="Applicants" value={35} icon={Users} to="#" hint="5 new" tone="attention" />
            <StatCard label="Applications" value={12} icon={FileText} to="#" />
            <StatCard label="Collaborations" value={2} icon={Handshake} to="#" tone="positive" hint="9 completed" />
            <StatCard label="Requests" value={undefined} loading icon={Inbox} />
          </StatGrid>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Panel
            title="My postings"
            viewAll={{ to: '#', label: 'View all' }}
            actions={
              <SegmentedControl
                label="Filter"
                value={segment}
                onChange={setSegment}
                segments={[
                  { value: 'open', label: 'Open', count: 3 },
                  { value: 'review', label: 'In review', count: 1 },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            }
            flush
          >
            <div className="p-4">
              <Table
                rowKey={(row) => row.id}
                data={rows}
                columns={[
                  { key: 'name', header: 'Title', render: (row) => <span className="font-medium text-app-text">{row.name}</span> },
                  { key: 'code', header: 'Code', render: (row) => <span className="app-mono">{row.code}</span> },
                  { key: 'applicants', header: 'Applicants', align: 'end', render: (row) => <span className="app-tabular">{row.applicants}</span> },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge
                        variant={row.status === 'APPROVED' ? 'success' : row.status === 'PENDING_REVIEW' ? 'warning' : 'danger'}
                        dot
                      >
                        {row.status === 'APPROVED' ? 'Live' : row.status === 'PENDING_REVIEW' ? 'In review' : 'Changes requested'}
                      </Badge>
                    ),
                  },
                ]}
              />
              <ListPager className="mt-4" page={2} pageSize={10} total={47} totalPages={5} onPageChange={() => undefined} />
            </div>
          </Panel>

          <Panel title="Post a job">
            <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Title" htmlFor="k-title">
                  <Input id="k-title" defaultValue="Backend developer" />
                </FormField>
                <FormField label="Employment type" htmlFor="k-type">
                  <Select id="k-type" defaultValue="FULL_TIME">
                    <option value="FULL_TIME">Full time</option>
                    <option value="PART_TIME">Part time</option>
                  </Select>
                </FormField>
                <FormField label="Salary (from)" htmlFor="k-salary" error="The maximum must not be lower than the minimum">
                  <Input id="k-salary" invalid defaultValue="90,000,000" />
                </FormField>
                <FormField label="City" htmlFor="k-city" hint="Optional">
                  <Input id="k-city" placeholder="Qazvin" />
                </FormField>
              </div>
              <FormField label="Description" htmlFor="k-desc">
                <TextArea id="k-desc" rows={3} defaultValue="We are looking for…" />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save draft</Button>
                <Button type="button" variant="outline" onClick={() => setModal(true)}>
                  Open dialog
                </Button>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
                <Button type="button" variant="danger">
                  Close posting
                </Button>
                <Button type="button" disabled>
                  Disabled
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Application progress">
            <div className="flex flex-col gap-4">
              <StageTracker application={{ outcome: 'PENDING', employerSeenAt: null }} />
              <StageTracker application={{ outcome: 'INTERVIEW', employerSeenAt: '2026-10-01' }} />
              <StageTracker application={{ outcome: 'DECLINED', employerSeenAt: '2026-10-01' }} />
            </div>
          </Panel>
          <Panel title="Needs your attention" flush>
            <ul className="divide-y divide-app-border-light">
              {['5 new applicants to review', '2 offers awaiting your decision', '3 unread messages'].map((item) => (
                <li key={item} className="flex items-center gap-3 px-4 py-3 text-body text-app-text">
                  <span className="app-led app-led-wait" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Account">
            <DetailList
              columns={2}
              items={[
                { label: 'Full name', value: 'Sara Ahmadi', wide: true },
                { label: 'Role', value: 'Member' },
                { label: 'Status', value: <Badge variant="success" dot>Active</Badge> },
              ]}
            />
          </Panel>
          <Card>
            <p className="app-label">Badges</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="success">Accepted</Badge>
              <Badge variant="warning">Waiting</Badge>
              <Badge variant="danger">Declined</Badge>
              <Badge variant="info">Interview</Badge>
              <Badge>Draft</Badge>
            </div>
          </Card>
          <EmptyState title="No saved jobs yet" description="Jobs you save appear here." action={<Button size="sm">Find jobs</Button>} />
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Withdraw application">
        <p>Withdraw this application? You can apply again while the role is open.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger">Withdraw</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
