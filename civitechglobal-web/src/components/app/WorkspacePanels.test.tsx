import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { AttentionPanel, GetStartedPanel } from './WorkspacePanels';
import type { Workspace } from '@/api/workspace';

/**
 * Which panels a member sees is the whole point of the home screen, so the
 * two that decide it from the data are pinned: what is waiting, and which
 * parts are offered because the member does not play them yet.
 */

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    verification: 'APPROVED',
    hiring: { postings: 0, open: 0, byStatus: {}, applicants: 0, unseen: 0, byOutcome: {}, recent: [], company: null },
    jobSearch: { applications: 0, byOutcome: {}, recent: [], savedJobs: 0, activeAlerts: 0 },
    client: { projects: 0, open: 0, byStatus: {}, bidsAwaiting: 0 },
    freelance: { bids: 0, byOutcome: {} },
    selling: { books: 0, booksByStatus: {} },
    collaborations: { active: 0, completed: 0 },
    unread: { notifications: 0, messages: 0 },
    recentNotifications: [],
    trackedRequests: 0,
    ...overrides,
  };
}

function renderEn(node: React.ReactNode) {
  return render(
    <MemoryRouter>
      <LocaleProvider locale="en">{node}</LocaleProvider>
    </MemoryRouter>,
  );
}

describe('AttentionPanel', () => {
  it('says so when nothing is waiting', () => {
    renderEn(<AttentionPanel data={workspace()} />);
    expect(screen.getByText('Nothing needs you right now.')).toBeInTheDocument();
  });

  it('lists what is waiting, each linking to where to act on it', () => {
    renderEn(
      <AttentionPanel
        data={workspace({
          verification: 'UNVERIFIED',
          hiring: { ...workspace().hiring, unseen: 3 },
          client: { ...workspace().client, bidsAwaiting: 2 },
          unread: { notifications: 0, messages: 5 },
        })}
      />,
    );
    expect(screen.getByRole('link', { name: /3 new applicants/ })).toHaveAttribute('href', '/dashboard/jobs');
    expect(screen.getByRole('link', { name: /2 offers awaiting/ })).toHaveAttribute('href', '/dashboard/projects');
    expect(screen.getByRole('link', { name: /5 unread messages/ })).toHaveAttribute('href', '/dashboard/messages');
    expect(screen.getByRole('link', { name: /Verify your identity/ })).toHaveAttribute('href', '/dashboard/verification');
  });
});

describe('GetStartedPanel', () => {
  it('offers only the parts the member does not play yet', () => {
    renderEn(
      <GetStartedPanel
        data={workspace({
          hiring: { ...workspace().hiring, postings: 2 },
          freelance: { bids: 4, byOutcome: {} },
        })}
      />,
    );
    expect(screen.queryByText('Hire someone')).not.toBeInTheDocument();
    expect(screen.queryByText('Offer your skills')).not.toBeInTheDocument();
    expect(screen.getByText('Find a job')).toBeInTheDocument();
    expect(screen.getByText('Sell your books')).toBeInTheDocument();
  });

  it('disappears for somebody who already does everything', () => {
    const { container } = renderEn(
      <GetStartedPanel
        data={workspace({
          hiring: { ...workspace().hiring, postings: 1 },
          jobSearch: { ...workspace().jobSearch, applications: 1 },
          client: { ...workspace().client, projects: 1 },
          freelance: { bids: 1, byOutcome: {} },
          selling: { books: 1, booksByStatus: {} },
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
