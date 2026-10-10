import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { SUPABASE_CONFIG, SupabaseConfig } from '../models/auth.models';
import { SupabaseService } from '../services/supabase.service';

/**
 * NOTA ARQUITECTÓNICA (¿Por qué sigue siendo necesario el Provider con @Service?):
 * Aunque `SupabaseService` esté decorado con `@Service()` (singleton en raíz), en una
 * arquitectura de monorepo Nx la librería compartida no puede ni debe importar los archivos
 * `environment.ts` de aplicaciones específicas (`storefront` o `backoffice`).
 *
 * `provideSupabase(environment)` actúa como el puente de desacoplamiento:
 * 1. La aplicación que inicia (Backoffice o Storefront) le pasa sus propias credenciales en `app.config.ts`.
 * 2. Este provider las registra en el InjectionToken `SUPABASE_CONFIG`.
 * 3. `SupabaseService` se instancia e inyecta dinámicamente esas credenciales sin violar
 *    las fronteras de dependencias de Nx.
 */
export function provideSupabase(config: SupabaseConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SUPABASE_CONFIG,
      useValue: config,
    },
    SupabaseService,
  ]);
}

