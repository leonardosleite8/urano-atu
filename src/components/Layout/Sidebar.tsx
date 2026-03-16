import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, BarChart3, PieChart, Package, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', label: 'CRM (Treinamentos)', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda de Clientes', icon: CalendarDays },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/analise-perfil', label: 'Análise de Perfil', icon: PieChart },
  { to: '/programacao-compras', label: 'Programação de Compras', icon: Package },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-56 flex-shrink-0 border-r border-gray-200 bg-white shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <span className="text-lg font-bold text-urano-red">Urano Balanças</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-urano-red text-white'
                    : 'text-urano-gray-dark hover:bg-gray-100 hover:text-urano-red'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={handleSair}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-urano-gray-dark transition-colors hover:bg-gray-100 hover:text-urano-red"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
