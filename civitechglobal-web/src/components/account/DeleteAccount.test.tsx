import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';

/** Closing the account: what it asks for, and who is not offered it. */

const mocks = vi.hoisted(() => ({
  role: 'USER',
  status: { activeContracts: 0, booksInHandOver: 0, canDelete: true },
  mfaEnabled: false,
  remove: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
}));

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({ user: { role: mocks.role }, logout: mocks.logout }),
}));
vi.mock('@/api/workspace', () => ({
  useDeletionStatus: () => ({ data: mocks.status }),
  useDeleteAccount: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));
vi.mock('@/api/mfa', () => ({
  useMfaStatus: () => ({ data: { enabled: mocks.mfaEnabled } }),
}));

const { DeleteAccount } = await import('./DeleteAccount');

function renderCard() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ToastProvider>
          <DeleteAccount />
        </ToastProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'USER';
  mocks.status = { activeContracts: 0, booksInHandOver: 0, canDelete: true };
  mocks.mfaEnabled = false;
});

describe('DeleteAccount', () => {
  it('stays shut until the password is in and the box is ticked', async () => {
    const user = userEvent.setup();
    const { container } = renderCard();
    const submit = await waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(button).not.toBeNull();
      return button!;
    });
    expect(submit).toBeDisabled();

    await user.type(container.querySelector('#delete-password')!, 'my-password');
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith({ password: 'my-password', code: undefined }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
  });

  it('asks for the second factor when it is on', async () => {
    mocks.mfaEnabled = true;
    const { container } = renderCard();
    await waitFor(() => expect(container.querySelector('#delete-code')).not.toBeNull());
  });

  it('shows no form while a contract is open', async () => {
    mocks.status = { activeContracts: 2, booksInHandOver: 1, canDelete: false };
    const { container } = renderCard();
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(container.querySelector('#delete-password')).toBeNull();
  });

  it('offers a staff account no form at all', async () => {
    mocks.role = 'ADMIN';
    const { container } = renderCard();
    await waitFor(() => expect(container.querySelector('p, div')).not.toBeNull());
    expect(container.querySelector('#delete-password')).toBeNull();
  });
});
