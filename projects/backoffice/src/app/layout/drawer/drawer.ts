import { Component, model, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { Button } from '@openng/optimus-ui/button';

export interface DrawerSections {
  catalogo: boolean;
  favoritos: boolean;
  usuarios: boolean;
  reportes: boolean;
}

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [DrawerModule, Button, RouterLink, RouterLinkActive],
  templateUrl: './drawer.html',
})
export class DrawerComponent {
  /**
   * Visibilidad del drawer vinculada bidireccionalmente con el layout padre
   */
  readonly visible = model<boolean>(false);

  /**
   * Estado fuertemente tipado de acordeones del menú lateral
   */
  readonly openSections = signal<DrawerSections>({
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
