import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { DrawerComponent } from './drawer/drawer';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, DrawerComponent],
  templateUrl: './layout.html',
})
export class AdminLayoutComponent {
  /**
   * Estado reactivo de apertura/cierre del drawer lateral
   */
  readonly isDrawerOpen = signal<boolean>(false);

  /**
   * Alterna la visibilidad del drawer al accionar el botón de hamburguesa del header
   */
  toggleDrawer(): void {
    this.isDrawerOpen.update((isOpen) => !isOpen);
  }
}

