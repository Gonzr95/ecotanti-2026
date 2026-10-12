import { Component, inject, model, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { Button } from '@openng/optimus-ui/button';
import { AuthService } from '@ecotanti/shared-auth';

export interface DrawerSections {
  ventas: boolean;
  catalogo: boolean;
  favoritos: boolean;
  usuarios: boolean;
  reportes: boolean;
}

@Component({
  selector: 'app-drawer',
  imports: [DrawerModule, Button, RouterLink, RouterLinkActive],
  templateUrl: './drawer.html',
})
export class DrawerComponent {
  private readonly authService = inject(AuthService);

  /**
   * Visibilidad del drawer vinculada bidireccionalmente con el layout padre
   */
  readonly visible = model<boolean>(false);

  /**
   * Helper reactivo para verificar permisos en template
   */
  hasPermission(code: string): boolean {
    return this.authService.hasPermission(code);
  }

  /**
   * Helper reactivo para verificar permisos por módulo
   */
  hasAnyPermission(codes: string[]): boolean {
    return this.authService.hasAnyPermission(codes);
  }

  /**
   * Estado fuertemente tipado de acordeones del menú lateral
   */
  readonly openSections = signal<DrawerSections>({
    ventas: true,
    catalogo: true,
    favoritos: false,
    usuarios: false,
    reportes: false,
  });

  /**
   * Alterna el estado de apertura/cierre de una sección del menú
   */
  toggleSection(sectionKey: keyof DrawerSections): void {
    this.openSections.update((sections) => ({
      ...sections,
      [sectionKey]: !sections[sectionKey],
    }));
  }

  /**
   * Cierra el drawer al seleccionar una opción de navegación
   */
  close(): void {
    this.visible.set(false);
  }
}
