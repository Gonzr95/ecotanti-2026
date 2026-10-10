import { InjectionToken } from '@angular/core';

export interface StorageConfig {
  bucket: string;
  folders: {
    users: string;
    products: string;
  };
  maxFileSizeMb?: number;
  allowedMimeTypes?: string[];
}

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  url?: string;
  anonKey?: string;
  supabase?: {
    url: string;
    anonKey: string;
  };
  storage?: StorageConfig;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');

export interface Profile {
  id: string; // uuid
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Permission {
  id: number; // int8
  code: string;
  name: string;
  module: string;
  description: string;
  created_at?: string;
}

export interface Role {
  id: number; // int8
  name: string;
  description: string | null;
  created_at?: string;
}

export interface RolePermission {
  rol_id: number; // int8
  permission_id: number; // int8
}

export interface UserRole {
  user_id: string; // uuid
  role_id: number; // int8
}

export interface SecurityLog {
  id?: number; // int8
  user_id?: string | null; // uuid
  attempted_mail?: string | null;
  username?: string | null;
  event_type: string;
  ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

