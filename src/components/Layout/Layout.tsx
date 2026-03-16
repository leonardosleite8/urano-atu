import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="pl-56">
        <div className="min-h-screen p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
