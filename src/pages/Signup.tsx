import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, UserPlus, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Signup() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, signup, error, clearError } = useAuth();
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
      await signup(nome, email, password);
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
            <UserPlus className="h-7 w-7 text-[#CC0000]" />
          </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          Criar conta
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          Preencha os dados abaixo para acessar o Urano CRM.
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
              htmlFor="signup-nome"
              className="mb-1.5 block text-xs font-semibold uppercase text-gray-600"
            >
              Nome
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="signup-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="signup-email"
              className="mb-1.5 block text-xs font-semibold uppercase text-gray-600"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="signup-email"
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
              htmlFor="signup-password"
              className="mb-1.5 block text-xs font-semibold uppercase text-gray-600"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#CC0000] py-3 text-sm font-bold text-white shadow transition-colors hover:bg-red-800"
          >
            <UserPlus className="h-4 w-4" />
            Criar conta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#CC0000] hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
