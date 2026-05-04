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
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import type {
  RoleTemplate,
  UserPermissions,
  UserPermissionsDoc,
  UserStatus,
  ViewScope,
} from '@/types/rbac';
import { ROLE_TEMPLATES } from '@/config/rbacTemplates';

const MASTER_ADMIN_EMAIL = 'leonardo@urano.com.br';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  rbacLoading: boolean;
  permissions: UserPermissions | null;
  viewScope: ViewScope;
  allowedScreens: string[];
  roleTemplate: RoleTemplate | null;
  status: UserStatus | null;
  isMasterAdmin: boolean;
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
  const [rbacLoading, setRbacLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [viewScope, setViewScope] = useState<ViewScope>('own');
  const [allowedScreens, setAllowedScreens] = useState<string[]>([]);
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplate | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        void carregarPermissoes(u);
      } else {
        // reset RBAC quando não há usuário
        setIsMasterAdmin(false);
        setPermissions(null);
        setViewScope('own');
        setAllowedScreens([]);
        setRoleTemplate(null);
        setStatus(null);
      }
    });
    return () => unsubscribe();
  }, []);

  async function carregarPermissoes(currentUser: User) {
    setRbacLoading(true);
    try {
      const email = currentUser.email?.toLowerCase() ?? '';
      const master = email === MASTER_ADMIN_EMAIL;
      setIsMasterAdmin(master);

      const ref = doc(db, 'user_permissions', currentUser.uid);
      const snap = await getDoc(ref);

      let docData: UserPermissionsDoc | null = null;

      if (!snap.exists()) {
        if (master) {
          const adminTemplate = ROLE_TEMPLATES.Admin;
          const novoDoc: UserPermissionsDoc = {
            email,
            status: 'ativo',
            roleTemplate: 'Admin',
            permissions: adminTemplate.permissions,
            viewScope: adminTemplate.viewScope,
            allowedScreens: adminTemplate.allowedScreens,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await setDoc(ref, {
            ...novoDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          docData = novoDoc;
        } else {
          // Usuário comum sem definição de permissão: começa como inativo até ser configurado no painel.
          const novoDoc: UserPermissionsDoc = {
            email,
            status: 'inativo',
            roleTemplate: 'Customizado',
            permissions: { canAdd: false, canEdit: false, canDelete: false },
            viewScope: 'own',
            allowedScreens: ['/'],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await setDoc(ref, {
            ...novoDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          docData = novoDoc;
        }
      } else {
        const data = snap.data() as Partial<UserPermissionsDoc>;
        docData = {
          email: data.email ?? email,
          status: data.status ?? 'inativo',
          roleTemplate: (data.roleTemplate ?? 'Customizado') as RoleTemplate,
          permissions: data.permissions ?? { canAdd: false, canEdit: false, canDelete: false },
          viewScope: (data.viewScope ?? 'own') as ViewScope,
          allowedScreens: data.allowedScreens ?? ['/'],
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
        };
      }

      if (!docData) return;

      if (master) {
        const adminTemplate = ROLE_TEMPLATES.Admin;
        setPermissions(adminTemplate.permissions);
        setViewScope(adminTemplate.viewScope);
        setAllowedScreens(adminTemplate.allowedScreens);
        setRoleTemplate('Admin');
        setStatus('ativo');
        return;
      }

      setPermissions(docData.permissions);
      setViewScope(docData.viewScope);
      setAllowedScreens(docData.allowedScreens);
      setRoleTemplate(docData.roleTemplate);
      setStatus(docData.status);

      if (docData.status === 'inativo') {
        setError('Seu usuário está inativo. Entre em contato com o administrador.');
        await signOut(auth);
      }
    } catch (e) {
      console.error('Erro ao carregar permissões do usuário:', e);
      setError('Não foi possível carregar suas permissões. Tente novamente mais tarde.');
    } finally {
      setRbacLoading(false);
    }
  }

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
    rbacLoading,
    permissions,
    viewScope,
    allowedScreens,
    roleTemplate,
    status,
    isMasterAdmin,
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
