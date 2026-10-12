import { Component, inject, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Button } from '@openng/optimus-ui/button';
import { Popover } from '@openng/optimus-ui/popover';
import { AuthService } from '@ecotanti/shared-auth';
import {
  AppNotification,
  NotificationsService,
} from '../../core/services/notifications.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [Button, Popover, DatePipe],
  templateUrl: './header.html',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly notificationsService = inject(NotificationsService);

  /**
   * Evento emitido al hacer clic en el botón de hamburguesa
   */
  readonly toggleMenu = output<void>();

  /**
   * Navega a la ruta de la notificación y la marca como leída
   */
  async onNotificationClick(notif: AppNotification, popover: Popover): Promise<void> {
    this.notificationsService.markAsRead(notif.id);
    popover.hide();
    if (notif.link) {
      await this.router.navigate([notif.link]);
    }
  }

  /**
   * Cierra la sesión activa en Supabase y redirige a la pantalla de login
   */
  async onLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }
}
