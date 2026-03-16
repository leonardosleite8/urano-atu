import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // erro já definido no contexto
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#CC0000]/10">
            <Lock className="h-7 w-7 text-[#CC0000]" />
          </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          Urano CRM
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          Entre com seu e-mail e senha para acessar o sistema.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-semibold uppercase text-gray-600"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-semibold uppercase text-gray-600"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#CC0000] py-3 text-sm font-bold text-white shadow transition-colors hover:bg-red-800"
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
          <p className="text-center text-sm text-gray-500">
            Não tem uma conta?{' '}
            <Link
              to="/signup"
              className="font-semibold text-[#CC0000] hover:underline"
            >
              Clique aqui para criar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
