import { inject, Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Autenticación para personal administrativo del Backoffice.
   * Valida credenciales, verifica roles en 'user_roles' y aplica ofuscación de seguridad.
   */
  async loginStaff(email: string, password: string): Promise<AuthResult> {
    try {
      const cleanEmail = email.trim();

      // 1. Validar email y password en Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: 'Credenciales incorrectas',
        };
      }

      // 2. Verificar si el usuario tiene roles de staff asignados en user_roles
      const { data: userRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', authData.user.id);

      if (rolesError || !userRoles || userRoles.length === 0) {
        // Intento de acceso no autorizado (cliente o usuario sin roles de staff)
        // Se registra silenciosamente en security_logs para auditoría
        try {
          await this.supabase.from('security_logs').insert({
            user_id: authData.user.id,
            attempted_mail: cleanEmail,
            event_type: 'unauthorized_backoffice_attempt',
            metadata: {
              reason: 'Usuario autenticado sin roles de personal en user_roles',
            },
          });
        } catch (logErr) {
          console.error('Error al registrar security_log:', logErr);
        }

        // Se destruye de inmediato la sesión
        await this.supabase.auth.signOut();

        // Ofuscación total: mismo mensaje de error
        return {
          success: false,
          error: 'Credenciales incorrectas',
        };
      }

      // Usuario autenticado con roles de staff válidos
      return {
        success: true,
        user: authData.user,
      };
    } catch (err) {
      console.error('Error inesperado durante el login:', err);
      return {
        success: false,
        error: 'Ocurrió un error al procesar el inicio de sesión',
      };
    }
  }

  /**
   * Cierra la sesión activa en Supabase
   */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Obtiene el usuario actual en sesión
   */
  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }
}

