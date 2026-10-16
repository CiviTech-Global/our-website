import { Outlet } from 'react-router';
import { FuturisticNavbar } from './FuturisticNavbar';
import { FuturisticFooter } from './FuturisticFooter';
import { PageHelp } from '@/components/help/PageHelp';

export function PublicLayout() {
  return (
    // The public site speaks Bagh at its expressive intensity: slower
    // curves, the garden ground, room for one performance per page.
    <div data-intensity="expressive" className="flex min-h-screen flex-col">
      <FuturisticNavbar />
      <main className="flex-1">
        <Outlet />
        {/* Every public page ends with its guide: what it is, how to use it,
            what it connects to, and its questions. */}
        <PageHelp />
      </main>
      <FuturisticFooter />
    </div>
  );
}
