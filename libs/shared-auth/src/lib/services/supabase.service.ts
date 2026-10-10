import { inject, Service, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../models/auth.models';

@Service()
export class SupabaseService {
  private readonly config = inject(SUPABASE_CONFIG);
  private readonly platformId = inject(PLATFORM_ID);
  // NOTA ARQUITECTÓNICA (_client con guión bajo):
  // Se nombra con prefijo '_' para permitir la coexistencia con el getter público `get client()`.
  // En TypeScript, una propiedad privada y un getter público no pueden compartir el mismo nombre.
  // El getter `client` se conserva como vía de escape para APIs avanzadas de SupabaseClient.
  private readonly _client: SupabaseClient;

  constructor() {
    // NOTA ARQUITECTÓNICA (Configuración SSR vs Navegador):
    // El proyecto Storefront utiliza Angular SSR (Node.js). En el servidor:
    // 1. window.localStorage no existe (evita errores/warnings en servidor).
    // 2. Evita fuga de sesiones entre usuarios concurrentes en memoria del servidor.
    // Solo cuando `isBrowser === true` se activan persistSession, autoRefreshToken y detectSessionInUrl.
    const isBrowser = isPlatformBrowser(this.platformId);
    const url = this.config.supabaseUrl || this.config.url || this.config.supabase?.url;
    const key = this.config.supabaseKey || this.config.anonKey || this.config.supabase?.anonKey;

    if (!url || !key) {
      throw new Error(
        'SupabaseConfig no proporcionada o incompleta. Asegúrate de pasar supabaseUrl y supabaseKey a provideSupabase(environment).'
      );
    }

    this._client = createClient(url, key, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }

  /**
   * Instancia raw de SupabaseClient (escape-hatch para funciones no envueltas)
   */
  get client(): SupabaseClient {
    return this._client;
  }

  // NOTA ARQUITECTÓNICA (Tipos de retorno explícitos):
  // En libs/shared-auth (librería de Nx), `tsconfig.lib.json` compila con `"declaration": true`
  // para emitir archivos .d.ts. Sin tipos explícitos, TypeScript infiere clases internas de Supabase
  // (GoTrueClient, etc.) que poseen campos privados, disparando el error TS4094.
  // Declarar los tipos explícitos (SupabaseClient['auth'], ReturnType<...>) garantiza compilación limpia.

  /**
   * Módulo de autenticación (login, logout, sesiones, etc.)
   */
  get auth(): SupabaseClient['auth'] {
    return this._client.auth;
  }

  /**
   * Módulo de almacenamiento (Storage buckets, upload, delete, etc.)
   */
  get storage(): SupabaseClient['storage'] {
    return this._client.storage;
  }

  /**
   * Configuración de storage declarada en environment
   */
  get storageConfig() {
    return this.config.storage;
  }

  /**
   * Atajo para acceder directamente al bucket 'media' (o el configurado)
   */
  mediaBucket(bucketName = this.config.storage?.bucket || 'media'): ReturnType<SupabaseClient['storage']['from']> {
    return this._client.storage.from(bucketName);
  }

  /**
   * Obtiene la URL pública de un archivo en el bucket media
   */
  getMediaUrl(path: string, bucketName = this.config.storage?.bucket || 'media'): string {
    const { data } = this._client.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Acceso directo a una tabla de la base de datos
   * Ej: this.supabase.from('profiles').select('*')
   */
  from(table: string): ReturnType<SupabaseClient['from']> {
    return this._client.from(table);
  }

  /**
   * Crea o suscribe a un canal en tiempo real
   */
  channel(name: string): RealtimeChannel {
    return this._client.channel(name);
  }

  /**
   * Elimina una suscripción de canal en tiempo real
   */
  removeChannel(channel: RealtimeChannel): ReturnType<SupabaseClient['removeChannel']> {
    return this._client.removeChannel(channel);
  }
}


export { SupabaseService as Supabase };
