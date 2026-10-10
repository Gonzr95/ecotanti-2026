import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@openng/optimus-ui/button';
import { AuthService } from '@ecotanti/shared-auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [Button],
  templateUrl: './header.html',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Evento emitido al hacer clic en el botón de hamburguesa
   */
  readonly toggleMenu = output<void>();

  /**
   * Cierra la sesión activa en Supabase y redirige a la pantalla de login
   */
  async onLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }
}

