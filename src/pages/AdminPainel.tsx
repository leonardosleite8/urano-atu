import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { Shield, Users, FileSearch, Edit2, Power, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleTemplate, UserPermissionsDoc, UserStatus } from '@/types/rbac';
import { ROLE_TEMPLATES } from '@/config/rbacTemplates';

type Aba = 'usuarios' | 'auditoria';

interface UserRow extends UserPermissionsDoc {
  id: string; // uid
}

interface AuditRow {
  id: string;
  timestamp: string;
  userEmail: string;
  userId: string;
  action: string;
  details: string;
  context?: string;
}

const MASTER_ADMIN_EMAIL = 'leonardo@urano.com.br';

export function AdminPainel() {
  const { user, isMasterAdmin, roleTemplate } = useAuth();
  const [aba, setAba] = useState<Aba>('usuarios');
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [editando, setEditando] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<UserPermissionsDoc | null>(null);
  const [salvando, setSalvando] = useState(false);

  const podeAcessarAdmin = isMasterAdmin || roleTemplate === 'Admin';

  useEffect(() => {
    if (!podeAcessarAdmin) return;
    void carregarUsuarios();
  }, [podeAcessarAdmin]);

  useEffect(() => {
    if (!podeAcessarAdmin) return;
    if (aba === 'auditoria') {
      void carregarAuditoria();
    }
  }, [aba, podeAcessarAdmin]);

  const usuariosOrdenados = useMemo(
    () =>
      [...usuarios].sort((a, b) => {
        if (a.email === MASTER_ADMIN_EMAIL) return -1;
        if (b.email === MASTER_ADMIN_EMAIL) return 1;
        return a.email.localeCompare(b.email);
      }),
    [usuarios],
  );

  async function carregarUsuarios() {
    setLoadingUsuarios(true);
    try {
      const snap = await getDocs(collection(db, 'user_permissions'));
      const rows: UserRow[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<UserPermissionsDoc>;
        rows.push({
          id: d.id,
          email: data.email ?? '',
          status: (data.status ?? 'inativo') as UserStatus,
          roleTemplate: (data.roleTemplate ?? 'Customizado') as RoleTemplate,
          permissions: data.permissions ?? { canAdd: false, canEdit: false, canDelete: false },
          viewScope: data.viewScope ?? 'own',
          allowedScreens: data.allowedScreens ?? ['/'],
          createdAt: data.createdAt ?? '',
          updatedAt: data.updatedAt ?? '',
        });
      });
      setUsuarios(rows);
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function carregarAuditoria() {
    setLoadingAuditoria(true);
    try {
      const q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(100),
      );
      const snap = await getDocs(q);
      const rows: AuditRow[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        rows.push({
          id: d.id,
          timestamp: data.timestamp?.toDate
            ? data.timestamp.toDate().toISOString()
            : String(data.timestamp ?? ''),
          userEmail: data.userEmail ?? '',
          userId: data.userId ?? '',
          action: data.action ?? '',
          details: data.details ?? '',
          context: data.context,
        });
      });
      setAuditLogs(rows);
    } catch (e) {
      console.error('Erro ao carregar auditoria:', e);
    } finally {
      setLoadingAuditoria(false);
    }
  }

  function abrirEditar(u: UserRow) {
    setEditando(u);
    setEditForm({
      email: u.email,
      status: u.status,
      roleTemplate: u.roleTemplate,
      permissions: { ...u.permissions },
      viewScope: u.viewScope,
      allowedScreens: [...u.allowedScreens],
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  function aplicarTemplate(role: RoleTemplate) {
    if (!editForm) return;
    const tpl = ROLE_TEMPLATES[role];
    setEditForm({
      ...editForm,
      roleTemplate: role,
      permissions: { ...tpl.permissions },
      viewScope: tpl.viewScope,
      allowedScreens: [...tpl.allowedScreens],
    });
  }

  async function salvarEdicao() {
    if (!editando || !editForm) return;
    if (!podeAcessarAdmin) return;
    if (editando.email === MASTER_ADMIN_EMAIL && editForm.status === 'inativo') {
      alert('O usuário Master Admin não pode ser inativado.');
      return;
    }
    setSalvando(true);
    try {
      const ref = doc(db, 'user_permissions', editando.id);
      await updateDoc(ref, {
        email: editForm.email.toLowerCase(),
        status: editForm.status,
        roleTemplate: editForm.roleTemplate,
        permissions: editForm.permissions,
        viewScope: editForm.viewScope,
        allowedScreens: editForm.allowedScreens,
      });
      setEditando(null);
      setEditForm(null);
      await carregarUsuarios();
    } catch (e) {
      console.error('Erro ao salvar permissões do usuário:', e);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  if (!podeAcessarAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white px-6 py-4 text-center shadow">
          <p className="text-sm font-semibold text-gray-700">
            Você não tem permissão para acessar o painel administrativo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-6 min-h-screen bg-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC0000]/10 text-[#CC0000]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-gray-600">
              Controle de acesso baseado em regras (RBAC) e auditoria do sistema.
            </p>
          </div>
        </div>
        {user && (
          <div className="rounded-full bg-white px-4 py-1.5 text-xs text-gray-600 shadow">
            Logado como <span className="font-semibold">{user.email}</span>{' '}
            {isMasterAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#CC0000]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#CC0000]">
                <CheckCircle2 className="h-3 w-3" />
                Master Admin
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setAba('usuarios')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
            aba === 'usuarios'
              ? 'bg-[#CC0000] text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Usuários
        </button>
        <button
          type="button"
          onClick={() => setAba('auditoria')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
            aba === 'auditoria'
              ? 'bg-[#CC0000] text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FileSearch className="h-4 w-4" />
          Auditoria
        </button>
      </div>

      {aba === 'usuarios' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-gray-700">
              Usuários e permissões
            </h2>
          </div>
          {loadingUsuarios ? (
            <div className="py-10 text-center text-gray-500">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      E-mail
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Papel
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Permissões
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Escopo
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Telas permitidas
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {usuariosOrdenados.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-gray-800">
                        {u.email}
                        {u.email === MASTER_ADMIN_EMAIL && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#CC0000]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#CC0000]">
                            Master
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {u.roleTemplate}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {u.status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                        {u.permissions.canAdd ? 'Add ' : ''}
                        {u.permissions.canEdit ? 'Edit ' : ''}
                        {u.permissions.canDelete ? 'Del' : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                        {u.viewScope === 'all' ? 'Todos' : 'Próprios'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {u.allowedScreens.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEditar(u)}
                            disabled={u.email === MASTER_ADMIN_EMAIL && !isMasterAdmin}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar({
                                ...u,
                                status: u.status === 'ativo' ? 'inativo' : 'ativo',
                              })
                            }
                            disabled={u.email === MASTER_ADMIN_EMAIL}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Power className="h-3.5 w-3.5" />
                            {u.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuariosOrdenados.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        Nenhum usuário encontrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {editando && editForm && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-base font-semibold text-gray-800">
                  Editar permissões de
                  <span className="ml-1 font-mono text-sm text-gray-700">
                    {editando.email}
                  </span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                      Papel
                    </label>
                    <select
                      value={editForm.roleTemplate}
                      onChange={(e) => aplicarTemplate(e.target.value as RoleTemplate)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Técnico">Técnico</option>
                      <option value="Vendedor">Vendedor</option>
                      <option value="Customizado">Customizado</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.permissions.canAdd}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            permissions: {
                              ...editForm.permissions,
                              canAdd: e.target.checked,
                            },
                          })
                        }
                      />
                      Pode adicionar
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.permissions.canEdit}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            permissions: {
                              ...editForm.permissions,
                              canEdit: e.target.checked,
                            },
                          })
                        }
                      />
                      Pode editar
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.permissions.canDelete}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            permissions: {
                              ...editForm.permissions,
                              canDelete: e.target.checked,
                            },
                          })
                        }
                      />
                      Pode excluir
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                      Escopo de visualização
                    </label>
                    <select
                      value={editForm.viewScope}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          viewScope: e.target.value as UserPermissionsDoc['viewScope'],
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
                    >
                      <option value="all">Todos os registros</option>
                      <option value="own">Apenas registros próprios</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                      Telas permitidas (rotas)
                    </label>
                    <textarea
                      value={editForm.allowedScreens.join('\n')}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          allowedScreens: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Uma rota por linha. Exemplo: <code>/</code>, <code>/agenda</code>,{' '}
                      <code>/dashboard</code>.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(null);
                      setEditForm(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarEdicao}
                    disabled={salvando}
                    className="rounded-lg bg-[#CC0000] px-5 py-2 text-sm font-bold text-white shadow hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {salvando ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'auditoria' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-gray-700">
              Auditoria (últimos 100 registros)
            </h2>
          </div>
          {loadingAuditoria ? (
            <div className="py-10 text-center text-gray-500">Carregando auditoria...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Data/Hora
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Usuário
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Ação
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Contexto
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString('pt-BR')
                          : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-700">
                        {log.userEmail}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-semibold text-gray-800">
                        {log.action}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-600">
                        {log.context ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

