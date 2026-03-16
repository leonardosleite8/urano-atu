import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code: string }).code === 'auth/invalid-credential' || (e as { code: string }).code === 'auth/wrong-password'
            ? 'E-mail ou senha incorretos.'
            : (e as { message?: string }).message ?? 'Erro ao entrar.'
          : 'Erro ao entrar.';
      setError(message);
      throw e;
    }
  };

  const signup = async (nome: string, email: string, password: string) => {
    setError(null);
    try {
      const trimEmail = email.trim();
      const { user: newUser } = await createUserWithEmailAndPassword(auth, trimEmail, password);
      if (nome.trim()) {
        await updateProfile(newUser, { displayName: nome.trim() });
      }
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
      let message = 'Erro ao criar conta.';
      if (code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      else if (code === 'auth/weak-password') message = 'A senha deve ter no mínimo 6 caracteres.';
      else if (code === 'auth/invalid-email') message = 'E-mail inválido.';
      else if (e && typeof e === 'object' && 'message' in e) message = (e as { message: string }).message;
      setError(message);
      throw e;
    }
  };

  const logout = async () => {
    setError(null);
    await signOut(auth);
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    signup,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
