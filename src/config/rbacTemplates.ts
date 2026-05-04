import type { RoleTemplate, UserPermissions, ViewScope } from '@/types/rbac';

interface RoleTemplateConfig {
  roleTemplate: RoleTemplate;
  permissions: UserPermissions;
  viewScope: ViewScope;
  allowedScreens: string[];
}

export const ROLE_TEMPLATES: Record<RoleTemplate, RoleTemplateConfig> = {
  Admin: {
    roleTemplate: 'Admin',
    permissions: { canAdd: true, canEdit: true, canDelete: true },
    viewScope: 'all',
    allowedScreens: [
      '/',
      '/agenda',
      '/dashboard',
      '/analise-perfil',
      '/programacao-compras',
      '/admin',
    ],
  },
  Técnico: {
    roleTemplate: 'Técnico',
    permissions: { canAdd: true, canEdit: true, canDelete: false },
    viewScope: 'own',
    allowedScreens: ['/', '/agenda', '/dashboard'],
  },
  Vendedor: {
    roleTemplate: 'Vendedor',
    permissions: { canAdd: true, canEdit: true, canDelete: false },
    viewScope: 'own',
    allowedScreens: ['/', '/agenda', '/programacao-compras'],
  },
  Customizado: {
    roleTemplate: 'Customizado',
    permissions: { canAdd: false, canEdit: false, canDelete: false },
    viewScope: 'own',
    allowedScreens: ['/', '/agenda'],
  },
};

