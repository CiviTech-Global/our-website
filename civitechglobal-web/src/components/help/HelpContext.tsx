import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { helpEntryForPath } from '@/content/help/registry';
import type { HelpEntry } from '@/content/help/types';
import { HelpPanel } from './HelpPanel';

interface HelpContextValue {
  /** The guide for the page on screen, if one is written for it. */
  pageEntry: HelpEntry | undefined;
  /** Opens the panel on a guide, or on this page's guide when no id is given. */
  open: (id?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const HelpContext = createContext<HelpContextValue | null>(null);

/** True while somebody is typing, when a bare "?" belongs to the field, not to us. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * The help system's state: which guide the page has, and whether the panel is
 * open on it.
 *
 * Sits inside the router so the guide follows the address, and above every
 * layout so the public navbar, the dashboard top bar and the in-page guide all
 * reach the same panel.
 */
export function HelpProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const pageEntry = helpEntryForPath(pathname);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = useCallback((id?: string) => setOpenId(id ?? pageEntry?.id ?? ''), [pageEntry]);
  const close = useCallback(() => setOpenId(null), []);

  // A guide is about the page it was opened on; moving on closes it.
  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  // "?" opens the guide, as it does in most tools that have one.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      setOpenId((current) => (current === null ? (pageEntry?.id ?? '') : null));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pageEntry]);

  const value = useMemo(
    () => ({ pageEntry, open, close, isOpen: openId !== null }),
    [pageEntry, open, close, openId]
  );

  return (
    <HelpContext.Provider value={value}>
      {children}
      {openId !== null && <HelpPanel articleId={openId} onClose={close} onOpenGuide={(id) => setOpenId(id)} />}
    </HelpContext.Provider>
  );
}

/**
 * Outside a provider — a component rendered on its own, in a test or a
 * storybook — help is simply absent: no guide, and opening it does nothing.
 * A missing help panel is not worth a crashed navbar.
 */
const NO_HELP: HelpContextValue = {
  pageEntry: undefined,
  open: () => {},
  close: () => {},
  isOpen: false,
};

export function useHelp(): HelpContextValue {
  return useContext(HelpContext) ?? NO_HELP;
}
