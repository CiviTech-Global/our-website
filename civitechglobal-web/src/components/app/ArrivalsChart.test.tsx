import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ArrivalsChart, niceCeiling } from './ArrivalsChart';

describe('niceCeiling', () => {
  it('rounds the busiest day up to a clean axis value', () => {
    expect(niceCeiling(0)).toBe(4);
    expect(niceCeiling(3)).toBe(4);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(13)).toBe(20);
    expect(niceCeiling(41)).toBe(50);
    expect(niceCeiling(100)).toBe(100);
  });
});

describe('ArrivalsChart', () => {
  const points = [
    { day: '2026-09-15', count: 2 },
    { day: '2026-09-16', count: 0 },
    { day: '2026-09-17', count: 5 },
  ];

  function renderChart() {
    return render(
      <LocaleProvider locale="en">
        <ArrivalsChart points={points} label="Arrivals" />
      </LocaleProvider>
    );
  }

  it('gives every day a keyboard-reachable column that names its date and count', () => {
    renderChart();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Sep 17: 5' })).toBeInTheDocument();
  });

  it('shows the same figures on focus as on hover', () => {
    renderChart();
    fireEvent.focus(screen.getByRole('button', { name: 'Sep 15: 2' }));
    expect(screen.getAllByText('Sep 15').length).toBeGreaterThan(0);
  });

  it('keeps the figures in a table for readers who cannot hover', () => {
    renderChart();
    const table = screen.getByRole('table', { name: 'Arrivals' });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
  });
});
