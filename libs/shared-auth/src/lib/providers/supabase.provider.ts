import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { SUPABASE_CONFIG, SupabaseConfig } from '../models/auth.models';
import { SupabaseService } from '../services/supabase.service';

export function provideSupabase(config: SupabaseConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SUPABASE_CONFIG,
      useValue: config,
    },
    SupabaseService,
  ]);
}
