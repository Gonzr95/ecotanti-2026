import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';

import { provideOptimus } from '@openng/optimus-ui/config';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { BackofficeTheme } from './theme/backoffice.theme';
import { provideSupabase } from '@ecotanti/shared-auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    ConfirmationService,
    MessageService,
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