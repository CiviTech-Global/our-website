import { Outlet } from 'react-router';
import { FuturisticNavbar } from './FuturisticNavbar';
import { FuturisticFooter } from './FuturisticFooter';

export function PublicLayout() {
  return (
    // The public site speaks Bagh at its expressive intensity: slower
    // curves, the garden ground, room for one performance per page.
    <div data-intensity="expressive" className="flex min-h-screen flex-col">
      <FuturisticNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <FuturisticFooter />
    </div>
  );
}
