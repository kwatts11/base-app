/**
 * Core database type definitions
 * Adapt from Supabase schema — keep in sync with migrations in database/migrations/
 *
 * TODO: [BASE-APP SETUP NEEDED] — AI adds app-specific entity types from PRD.md
 */

// ── User roles ──────────────────────────────────────────────────────────────
/**
 * User role hierarchy (lowest → highest)
 * TODO: Rename to match PRD.md role names
 */
export enum UserRole {
  Employee = 'employee', // TODO: rename to your lowest role
  Manager = 'manager',   // TODO: rename to your mid-level role
  Admin = 'admin',       // Keep admin as the highest role
}

// ── User profile ────────────────────────────────────────────────────────────
export interface UserProfileRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Editable enums ──────────────────────────────────────────────────────────
export interface EditableEnumRow {
  id: string;
  enum_name: string;
  enum_value: string;
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/** UI-facing type for editable enum operations */
export interface EditableEnum {
  id: string;
  enumName: string;
  value: string;
  displayOrder: number;
  isActive: boolean;
  isPublic: boolean;
}

// ── Areas ────────────────────────────────────────────────────────────────────
export interface AreaRow {
  id: string;
  name: string;
  color: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Locations ────────────────────────────────────────────────────────────────
export interface LocationRow {
  id: string;
  name: string;
  area_id: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  group: string | null;
  created_at: string;
  updated_at: string;
}

/** LocationRow joined with its parent area */
export interface LocationWithArea extends LocationRow {
  area: AreaRow;
}

// ── Session invalidations (admin-forced logout) ──────────────────────────────
export interface SessionInvalidationRow {
  id: string;
  user_id: string;
  reason: string;
  processed: boolean;
  created_at: string;
}

// ── Database shape for Supabase typed client ────────────────────────────────
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: Omit<UserProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfileRow, 'id' | 'created_at'>>;
      };
      editable_enums: {
        Row: EditableEnumRow;
        Insert: Omit<EditableEnumRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EditableEnumRow, 'id' | 'created_at'>>;
      };
      session_invalidations: {
        Row: SessionInvalidationRow;
        Insert: Omit<SessionInvalidationRow, 'id' | 'created_at'>;
        Update: Partial<Omit<SessionInvalidationRow, 'id' | 'created_at'>>;
      };
      areas: {
        Row: AreaRow;
        Insert: Omit<AreaRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AreaRow, 'id' | 'created_at'>>;
      };
      locations: {
        Row: LocationRow;
        Insert: Omit<LocationRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LocationRow, 'id' | 'created_at'>>;
      };
      // TODO: [BASE-APP SETUP NEEDED] — AI adds app entity table types here
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
