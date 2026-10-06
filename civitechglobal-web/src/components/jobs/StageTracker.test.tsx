import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { daysUntil, placeText } from '@/lib/jobFormat';
import { StageTracker } from './StageTracker';

function renderEn(node: React.ReactNode) {
  return render(<LocaleProvider locale="en">{node}</LocaleProvider>);
}

describe('StageTracker', () => {
  it('marks the furthest step reached as the current one', () => {
    renderEn(<StageTracker application={{ outcome: 'INTERVIEW', employerSeenAt: '2026-10-01' }} />);
    expect(screen.getByText('Interview').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('counts an opened application as seen even before any decision', () => {
    renderEn(<StageTracker application={{ outcome: 'PENDING', employerSeenAt: '2026-10-01' }} />);
    expect(screen.getByText('Seen').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('says "not selected" at the end of a declined application', () => {
    renderEn(<StageTracker application={{ outcome: 'DECLINED', employerSeenAt: null }} />);
    expect(screen.getByText('Not selected').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('daysUntil', () => {
  const now = new Date(2026, 9, 6, 22, 0);

  it('counts calendar days, not elapsed hours', () => {
    // Two days ahead in the morning is still "in 2 days" late in the evening.
    expect(daysUntil(new Date(2026, 9, 8, 9, 0).toISOString(), now)).toBe(2);
    expect(daysUntil(new Date(2026, 9, 7, 1, 0).toISOString(), now)).toBe(1);
    expect(daysUntil(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toBe(0);
  });

  it('is null once the deadline has passed, or when there is none', () => {
    expect(daysUntil(new Date(2026, 9, 6, 8, 0).toISOString(), now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe('placeText', () => {
  it('says a capital named after its province once', () => {
    expect(placeText({ city: 'تهران', province: 'تهران' }, 'fa')).toBe('تهران');
    expect(placeText({ city: 'Qazvin', province: 'قزوین' }, 'en')).toBe('Qazvin');
  });

  it('keeps both when they differ', () => {
    expect(placeText({ city: 'Buin Zahra', province: 'قزوین' }, 'en')).toBe('Buin Zahra, Qazvin');
  });
});
