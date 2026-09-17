import { createContext, useContext, useEffect } from 'react';

/**
 * What a page tells the shell about itself.
 *
 * The breadcrumb trail is built from navigation, which knows "CVs" but not
 * that this particular CV is Sara Ahmadi's. A page header registers its title
 * here, and the shell appends it when the reader is below a navigation link
 * rather than on it.
 */
export interface ShellContextValue {
  setPageCrumb: (label: string | null) => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

/** Registers `label` as the current page's crumb for as long as the caller is mounted. */
export function usePageCrumb(label: string | undefined) {
  const shell = useContext(ShellContext);

  useEffect(() => {
    if (!shell || !label) return;
    shell.setPageCrumb(label);
    return () => shell.setPageCrumb(null);
  }, [shell, label]);
}
