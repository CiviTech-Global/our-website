import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewActions } from './ReviewActions';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';

function renderPanel(onReview: (input: unknown) => Promise<unknown>) {
  return render(
    <LocaleProvider>
      <ToastProvider>
        <ReviewActions onReview={onReview as never} />
      </ToastProvider>
    </LocaleProvider>
  );
}

describe('ReviewActions', () => {
  /**
   * The server refuses a rejection with no reason, and it is right to. Catching
   * it here means the reviewer is told before they lose the click rather than
   * after — and, more importantly, it keeps the two from drifting apart.
   */
  it('refuses to reject without a note', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderPanel(onReview);

    await userEvent.click(screen.getByRole('button', { name: /رد|reject/i }));

    expect(onReview).not.toHaveBeenCalled();
  });

  it('refuses to request changes without a note, for the same reason', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderPanel(onReview);

    await userEvent.click(screen.getByRole('button', { name: /اصلاح|changes/i }));

    expect(onReview).not.toHaveBeenCalled();
  });

  /** Approving needs no note; demanding one only teaches people to type "ok". */
  it('approves without a note', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderPanel(onReview);

    await userEvent.click(screen.getByRole('button', { name: /تأیید|approve/i }));

    await waitFor(() => expect(onReview).toHaveBeenCalledOnce());
    expect(onReview.mock.calls[0][0]).toMatchObject({ decision: 'APPROVED' });
  });

  it('sends both notes, kept apart, once a reason is given', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderPanel(onReview);

    const areas = screen.getAllByRole('textbox');
    await userEvent.type(areas[0], 'Please state the salary range.');
    await userEvent.type(areas[1], 'Third attempt from this account.');
    await userEvent.click(screen.getByRole('button', { name: /اصلاح|changes/i }));

    await waitFor(() => expect(onReview).toHaveBeenCalledOnce());
    expect(onReview.mock.calls[0][0]).toEqual({
      decision: 'CHANGES_REQUESTED',
      reviewNote: 'Please state the salary range.',
      internalNote: 'Third attempt from this account.',
    });
  });
});
