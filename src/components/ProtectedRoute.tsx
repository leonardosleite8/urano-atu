import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, rbacLoading, allowedScreens, isMasterAdmin } = useAuth();
  const location = useLocation();

  if (loading || rbacLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const from = location.pathname + location.search;
    const to = from === '/' ? '/login' : `/login?from=${encodeURIComponent(from)}`;
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (!isMasterAdmin) {
    const path = location.pathname;
    const permitido =
      allowedScreens.length === 0 ||
      allowedScreens.some((route) =>
        route === '/'
          ? path === '/'
          : path === route || path.startsWith(route + '/'),
      );
    if (!permitido) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

