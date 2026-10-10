import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideOptimus } from '@openng/optimus-ui/config';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { BackofficeTheme } from './theme/backoffice.theme';
import { provideSupabase } from '@ecotanti/shared-auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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