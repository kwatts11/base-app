/**
 * Role-based permission utilities
 * TODO: [BASE-APP SETUP NEEDED] — AI renames PermissionCategory values and updates
 * PERMISSION_MATRIX to match roles defined in PRD.md
 */
import { UserRole } from '../types/database';

// ── Permission categories ──────────────────────────────────────────────────────
// TODO: Rename/extend these to match your app's permission model from PRD.md
export enum PermissionCategory {
  Admin = 'admin',
  UserManagement = 'user_management',
  ContentManagement = 'content_management',
  Reports = 'reports',
  // TODO: Add app-specific permission categories here
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  minimumRole?: UserRole;
}

// ── Role hierarchy ─────────────────────────────────────────────────────────────
// Higher number = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.Employee]: 1,
  [UserRole.Manager]: 2,
  [UserRole.Admin]: 3,
};

// ── Permission matrix ──────────────────────────────────────────────────────────
// Maps each permission category to the minimum role that can access it
// TODO: Adjust to match PRD.md role definitions
const PERMISSION_MATRIX: Record<PermissionCategory, UserRole> = {
  [PermissionCategory.Admin]: UserRole.Admin,
  [PermissionCategory.UserManagement]: UserRole.Admin,
  [PermissionCategory.ContentManagement]: UserRole.Manager,
  [PermissionCategory.Reports]: UserRole.Manager,
};

// ── Human-readable role labels ─────────────────────────────────────────────────
// TODO: [BASE-APP SETUP NEEDED] — AI sets these from PRD.md role names
export const ROLE_LABELS: Record<UserRole, string> = {
  // WIZARD:BEGIN role-labels
  [UserRole.Employee]: 'Employee',
  [UserRole.Manager]: 'Manager',
  [UserRole.Admin]: 'Admin',
  // WIZARD:END role-labels
};

// ── Core permission check ──────────────────────────────────────────────────────
export function checkPermission(
  userRole: UserRole | null,
  category: PermissionCategory
): PermissionResult {
  if (!userRole) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  const requiredRole = PERMISSION_MATRIX[category];
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;

  if (userLevel >= requiredLevel) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Requires ${ROLE_LABELS[requiredRole] ?? requiredRole} role or higher`,
    minimumRole: requiredRole,
  };
}

export function hasMinimumRole(
  userRole: UserRole | null,
  minimumRole: UserRole
): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 99);
}

// ── Convenience helpers ────────────────────────────────────────────────────────
export const canManageUsers = (role: UserRole | null) =>
  checkPermission(role, PermissionCategory.UserManagement).allowed;

export const canManageContent = (role: UserRole | null) =>
  checkPermission(role, PermissionCategory.ContentManagement).allowed;

export const canViewReports = (role: UserRole | null) =>
  checkPermission(role, PermissionCategory.Reports).allowed;

export const canPerformAdminFunctions = (role: UserRole | null) =>
  checkPermission(role, PermissionCategory.Admin).allowed;
