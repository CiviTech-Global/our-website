import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { expectNoA11yViolations } from '@/test/a11y';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { FormField } from './FormField';
import { Input } from './Input';
import { Modal } from './Modal';
import { Pagination } from './Pagination';
import { Select } from './Select';
import { Spinner } from './Spinner';
import { TextArea } from './TextArea';

/**
 * The shared primitives, checked against axe.
 *
 * These are the pieces every page is built from, so a violation here is a
 * violation everywhere at once — which makes them the highest-leverage place
 * to assert rather than hope. Pages compose these plus their own markup; this
 * suite covers the half that is reused.
 */

describe('form primitives', () => {
  it('labels an input through FormField', async () => {
    const { container } = render(
      <FormField label="نام و نام خانوادگی" htmlFor="full-name">
        <Input id="full-name" />
      </FormField>,
    );

    // The association is the whole point of the component: a placeholder is
    // not a label, and a screen reader announces nothing without this.
    expect(screen.getByLabelText('نام و نام خانوادگی')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('ties an error message to the field it belongs to', async () => {
    const { container } = render(
      <FormField label="ایمیل" htmlFor="email" error="ایمیل معتبر نیست">
        <Input id="email" invalid />
      </FormField>,
    );

    await expectNoA11yViolations(container);
  });

  it('labels a hint without turning it into the field name', async () => {
    const { container } = render(
      <FormField label="مهارت‌ها" htmlFor="skills" hint="با ویرگول جدا کنید">
        <TextArea id="skills" />
      </FormField>,
    );

    expect(screen.getByLabelText('مهارت‌ها')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('labels a select', async () => {
    const { container } = render(
      <FormField label="وضعیت" htmlFor="status">
        <Select id="status">
          <option value="NEW">تازه</option>
          <option value="DONE">انجام‌شده</option>
        </Select>
      </FormField>,
    );

    await expectNoA11yViolations(container);
  });
});

describe('interactive primitives', () => {
  it('gives a loading button an accessible name and a busy state', async () => {
    const { container } = render(<Button isLoading>ارسال</Button>);

    // A spinner that replaces the label leaves the control unnamed, which is
    // the usual way this component breaks.
    expect(screen.getByRole('button')).toHaveAccessibleName(/ارسال/);
    await expectNoA11yViolations(container);
  });

  it('gives an icon-only button a name', async () => {
    const { container } = render(
      <Button aria-label="بستن">
        <span aria-hidden="true">×</span>
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'بستن' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('names the pagination controls', async () => {
    // Pagination reads its labels from the locale, so it needs the provider —
    // which is also the realistic way it is rendered.
    const { container } = render(
      <LocaleProvider>
        <Pagination page={2} totalPages={5} onPageChange={vi.fn()} />
      </LocaleProvider>,
    );

    await expectNoA11yViolations(container);
  });

  it('announces a spinner rather than leaving it silent', async () => {
    const { container } = render(<Spinner label="در حال بارگذاری" />);

    await expectNoA11yViolations(container);
  });
});

describe('modal', () => {
  it('is a dialog with a name, and traps nothing when closed', async () => {
    const { container, rerender } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="تأیید">
        <p>محتوا</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <Modal isOpen onClose={vi.fn()} title="تأیید">
        <p>محتوا</p>
      </Modal>,
    );

    // A dialog without an accessible name is announced as just "dialog".
    expect(screen.getByRole('dialog')).toHaveAccessibleName('تأیید');
    await expectNoA11yViolations(container);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="تأیید">
        <p>محتوا</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('display primitives', () => {
  it('renders a badge without relying on colour alone', async () => {
    const { container } = render(<Badge variant="danger">رد شد</Badge>);

    // Colour is not information on its own; the text has to carry it.
    expect(screen.getByText('رد شد')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('renders an empty state', async () => {
    const { container } = render(<EmptyState title="چیزی اینجا نیست" />);
    await expectNoA11yViolations(container);
  });

  it('renders a card', async () => {
    const { container } = render(
      <Card>
        <h2>عنوان</h2>
        <p>متن</p>
      </Card>,
    );
    await expectNoA11yViolations(container);
  });
});
