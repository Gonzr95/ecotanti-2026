import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideOptimus } from '@openng/optimus-ui/config';
import { BackofficeTheme } from './theme/backoffice.theme';
import { provideSupabase } from '@ecotanti/shared-auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideOptimus({ 
      theme: { 
        preset: BackofficeTheme,
        options: {
          darkModeSelector: '.dark',
        },
      },
      ripple: true,
    }),
    provideSupabase(environment),
  ],
};