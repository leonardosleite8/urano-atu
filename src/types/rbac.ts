export type RoleTemplate = 'Admin' | 'Técnico' | 'Vendedor' | 'Customizado';

export type UserStatus = 'ativo' | 'inativo';

export type ViewScope = 'all' | 'own';

export interface UserPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UserPermissionsDoc {
  email: string;
  status: UserStatus;
  roleTemplate: RoleTemplate;
  permissions: UserPermissions;
  viewScope: ViewScope;
  allowedScreens: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';

export interface AuditLog {
  timestamp: Date | string;
  userEmail: string;
  userId: string;
  action: AuditAction;
  details: string;
  context?: string;
}

