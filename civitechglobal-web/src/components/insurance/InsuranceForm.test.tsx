import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import type { ProductDetail } from '@/types/insurance';

/**
 * The insurance form's last step, with and without an SMS gateway.
 *
 * Without one there is no code to send and so no token to wait for: the
 * typed number is the whole check. The submit key once kept waiting for a
 * token anyway, which left every request form on a gateway-less deployment
 * impossible to send.
 */

const mocks = vi.hoisted(() => ({
  sms: false,
  submit: vi.fn(async () => ({
    id: 'r1',
    trackingCode: 'INSU1234',
    productTitle: 'Test',
    intakeMode: 'CALLBACK' as const,
  })),
}));

vi.mock('@/api/capabilities', () => ({
  useCapabilities: () => ({ email: false, sms: mocks.sms }),
}));

vi.mock('@/api/insurance', () => ({
  useSubmitInsuranceRequest: () => ({ mutateAsync: mocks.submit, isPending: false }),
  useSendOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVerifyOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const { InsuranceForm } = await import('./InsuranceForm');

// Contact fields only, so the form is a single step.
const product = {
  slug: 'test-product',
  intakeMode: 'CALLBACK',
  formSchema: [
    { name: 'fullName', label: 'نام', labelEn: 'Name', type: 'text', required: true },
  ],
} as unknown as ProductDetail;

function renderForm() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <InsuranceForm product={product} onSubmitted={vi.fn()} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

const submitKey = () => screen.getByRole('button', { name: /درخواست|request/i });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the insurance form without an SMS gateway', () => {
  beforeEach(() => {
    mocks.sms = false;
  });

  it('can be sent with a typed number', async () => {
    renderForm();
    expect(submitKey()).toBeEnabled();

    await userEvent.type(screen.getAllByRole('textbox')[0]!, 'Test User');
    await userEvent.type(screen.getByPlaceholderText('09xxxxxxxxx'), '09121234567');
    await userEvent.click(submitKey());

    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith(
        expect.objectContaining({ productSlug: 'test-product', phone: '09121234567' })
      )
    );
  });

  it('refuses a number that is not a mobile one', async () => {
    renderForm();
    await userEvent.type(screen.getAllByRole('textbox')[0]!, 'Test User');
    await userEvent.type(screen.getByPlaceholderText('09xxxxxxxxx'), '12345');
    await userEvent.click(submitKey());

    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('the insurance form with an SMS gateway', () => {
  it('waits for the number to be verified', () => {
    mocks.sms = true;
    renderForm();
    expect(submitKey()).toBeDisabled();
  });
});
