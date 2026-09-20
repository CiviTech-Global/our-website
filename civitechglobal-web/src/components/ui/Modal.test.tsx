import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from './Modal';

function Harness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [isOpen, setOpen] = useState(initialOpen);
  return (
    <div>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="Test modal">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>
    </div>
  );
}

// The dialog's header (and its Close button) renders before `children` in
// DOM order, so Close — not the first child — is the first focusable
// element and the Tab-trap wraps around it. These tests pin that real
// order down so a future markup reshuffle can't silently break the trap.
describe('Modal focus trap', () => {
  it('moves focus to the first focusable element inside the dialog on open (the Close button)', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test modal">
        <button type="button">First</button>
      </Modal>
    );

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('wraps Tab from the last focusable element back to the first', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test modal">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>
    );

    screen.getByRole('button', { name: 'Second' }).focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test modal">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>
    );

    screen.getByRole('button', { name: 'Close' }).focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
  });

  // Every page writes `onClose={() => setEditing(null)}`, so the prop is a new
  // function on each parent render. While the trap listed it as a dependency,
  // typing re-ran the effect and the re-run pulled focus back to Close: the
  // field took one character per click. The value has to accumulate.
  it('leaves focus in a field while a controlled form re-renders the parent', () => {
    function FormHarness() {
      const [value, setValue] = useState('');
      return (
        <Modal isOpen onClose={() => undefined} title="Test modal">
          <input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
        </Modal>
      );
    }

    render(<FormHarness />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();

    for (const text of ['س', 'سل', 'سلا', 'سلام']) {
      fireEvent.change(field, { target: { value: text } });
      expect(field).toHaveFocus();
    }

    expect(field).toHaveValue('سلام');
  });

  it('closes on Escape with the newest onClose after a re-render', () => {
    const stale = vi.fn();
    const fresh = vi.fn();

    const { rerender } = render(
      <Modal isOpen onClose={stale} title="Test modal">
        <button type="button">First</button>
      </Modal>
    );
    rerender(
      <Modal isOpen onClose={fresh} title="Test modal">
        <button type="button">First</button>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fresh).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Test modal">
        <button type="button">First</button>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the element that was focused before opening', () => {
    render(<Harness initialOpen={false} />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});
