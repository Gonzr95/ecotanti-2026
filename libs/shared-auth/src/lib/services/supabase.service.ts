import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly config = inject(SUPABASE_CONFIG);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _client: SupabaseClient;

  constructor() {
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
   * Instancia raw de SupabaseClient
   */
  get client(): SupabaseClient {
    return this._client;
  }

  /**
   * Módulo de autenticación (login, logout, sesiones, etc.)
   */
  get auth() {
    return this._client.auth;
  }

  /**
   * Módulo de almacenamiento (Storage buckets, upload, delete, etc.)
   */
  get storage() {
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
  mediaBucket(bucketName = this.config.storage?.bucket || 'media') {
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
  from(table: string) {
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
  removeChannel(channel: RealtimeChannel) {
    return this._client.removeChannel(channel);
  }
}

export { SupabaseService as Supabase };
