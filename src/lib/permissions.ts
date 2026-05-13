import type { UserRole, UserPermission, PermissionModule, PermissionAction } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { PermissionModule, PermissionAction };

export type UserWithPermissions = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
  permissions: UserPermission[];
  [key: string]: unknown;
};

// ─── Module / action catalogue ────────────────────────────────────────────────
// Extend PERMISSION_MODULES and MODULE_LABELS as you add new modules to the app.

export const PERMISSION_MODULES: Record<PermissionModule, PermissionAction[]> = {
  dashboard:      ["ver"],
  administracion: ["ver", "editar"],
  // Add your app-specific modules here
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard:      "Dashboard",
  administracion: "Administración",
  // Add labels matching your modules
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  ver:     "Ver",
  crear:   "Crear",
  editar:  "Editar",
  eliminar: "Eliminar",
  // Add labels for any additional actions you define
};

// ─── Role defaults ────────────────────────────────────────────────────────────

type Defaults = Partial<Record<PermissionModule, PermissionAction[]>>;

const ROLE_DEFAULTS: Record<UserRole, Defaults> = {
  VIEWER: {
    dashboard: ["ver"],
  },
  EJECUTIVO: {
    dashboard: ["ver"],
  },
  SUPERVISOR: {
    dashboard:      ["ver"],
    administracion: ["ver"],
  },
  FACTURACION: {
    dashboard: ["ver"],
  },
  ADMIN: {
    // Admin always gets true from hasPermission regardless of this table,
    // but we fill it for completeness (used by the UI to render defaults).
    dashboard:      ["ver"],
    administracion: ["ver", "editar"],
  },
};

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluates whether a user has a given permission.
 * Order of precedence:
 *   1. ADMIN role → always true (cannot be restricted)
 *   2. User-level override (UserPermission row)
 *   3. Role default (ROLE_DEFAULTS)
 */
export function hasPermission(
  user: UserWithPermissions,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (user.role === "ADMIN") return true;

  const override = user.permissions.find(
    (p) => p.module === module && p.action === action
  );
  if (override !== undefined) return override.granted;

  return ROLE_DEFAULTS[user.role][module]?.includes(action) ?? false;
}

/**
 * Returns the role default for a given module/action (used by UI to show
 * whether a checkbox is "inherited" or overridden).
 */
export function roleDefault(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === "ADMIN") return true;
  return ROLE_DEFAULTS[role][module]?.includes(action) ?? false;
}
