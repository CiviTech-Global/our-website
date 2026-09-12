import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateField } from './DateField';
import { LocaleProvider } from '@/i18n/LocaleProvider';

function renderField(props: Partial<Parameters<typeof DateField>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <LocaleProvider>
      <DateField value="" onChange={onChange} {...props} />
    </LocaleProvider>
  );
  return { onChange };
}

const open = async () => userEvent.click(screen.getByRole('button', { expanded: false }));

/** The month heading inside the popup, as opposed to the closed field's text. */
const heading = () => within(screen.getByRole('dialog')).getByText(/[0-9۰-۹]/, { selector: 'span.font-medium' });

describe('DateField', () => {
  /**
   * The whole reason this exists instead of `<input type="date">`: the native
   * control renders in the browser locale's calendar, which for our users is
   * the wrong one and cannot be overridden.
   */
  it('opens on the Iranian calendar by default', async () => {
    renderField({ value: '2025-03-25' });

    // The closed field reads in Jalali too: 1404-01-05, not 25 March.
    expect(screen.getByRole('button', { expanded: false }).textContent).toMatch(
      /فروردین|Farvardin/
    );

    await open();
    expect(heading().textContent).toMatch(/فروردین|Farvardin/);
  });

  it('can be pinned to the Gregorian calendar by its caller', async () => {
    renderField({ value: '2025-03-25', defaultCalendar: 'gregorian' });
    await open();

    expect(heading().textContent).toMatch(/March/);
    expect(screen.queryByText(/فروردین|Farvardin/)).toBeNull();
  });

  it('switches calendar without changing which day is selected', async () => {
    renderField({ value: '2025-03-25' });
    await open();

    await userEvent.click(screen.getByRole('button', { name: /تقویم میلادی|Gregorian/ }));
    expect(heading().textContent).toMatch(/March/);

    // The selected cell is still the same day, now numbered 25 rather than 5.
    expect(screen.getByRole('button', { pressed: true }).textContent).toMatch(/25|۲۵/);
  });

  it('can have the toggle withheld entirely', async () => {
    renderField({ value: '2025-03-25', allowCalendarToggle: false });
    await open();

    expect(screen.queryByRole('button', { name: /تقویم میلادی|Gregorian/ })).toBeNull();
  });

  /** Whatever the display calendar, the value handed back is Gregorian ISO. */
  it('emits an ISO Gregorian date when a Jalali day is picked', async () => {
    const { onChange } = renderField({ value: '2025-03-25' });
    await open();

    // Farvardin 1, 1404.
    await userEvent.click(screen.getByRole('button', { name: /^(1|۱)$/ }));

    expect(onChange).toHaveBeenCalledWith('2025-03-21');
  });

  it('refuses a day outside the given bounds', async () => {
    const { onChange } = renderField({ value: '2025-03-25', min: '2025-03-23' });
    await open();

    const first = screen.getByRole('button', { name: /^(1|۱)$/ });
    expect(first.hasAttribute('disabled')).toBe(true);

    await userEvent.click(first);
    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * The bug this project already hit once in the navbar: a panel that closes
   * on mouseleave cannot be reached, because reaching it requires moving the
   * cursor off the trigger.
   */
  it('stays open while the pointer moves across it', async () => {
    renderField({ value: '2025-03-25' });
    await open();

    await userEvent.hover(screen.getByRole('dialog'));
    await userEvent.unhover(screen.getByRole('dialog'));

    expect(screen.queryByRole('dialog')).toBeTruthy();
  });

  it('closes on Escape', async () => {
    renderField({ value: '2025-03-25' });
    await open();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clears to an empty value when it is not required', async () => {
    const { onChange } = renderField({ value: '2025-03-25' });

    await userEvent.click(screen.getByRole('button', { name: /پاک کردن|Clear/ }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('offers no clear button when the field is required', () => {
    renderField({ value: '2025-03-25', required: true });

    expect(screen.queryByRole('button', { name: /پاک کردن|Clear/ })).toBeNull();
  });
});
