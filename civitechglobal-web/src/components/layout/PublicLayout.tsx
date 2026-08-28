import { Outlet } from 'react-router';
import { FuturisticNavbar } from './FuturisticNavbar';
import { FuturisticFooter } from './FuturisticFooter';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <FuturisticNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <FuturisticFooter />
    </div>
  );
}
