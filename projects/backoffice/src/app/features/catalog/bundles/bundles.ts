import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '@openng/optimus-ui/button';
import { BundleWithItems } from '@ecotanti/shared-catalog';
import { BundleCreateWizardComponent } from './components/bundle-create-wizard/bundle-create-wizard';

@Component({
  selector: 'app-bundles',
  standalone: true,
  imports: [CommonModule, Button, BundleCreateWizardComponent],
  templateUrl: './bundles.html',
})
export class BundlesComponent {
  /**
   * Visibilidad reactiva del modal asistente de creación de combos
   */
  readonly isWizardVisible = signal<boolean>(false);

  /**
   * Abre el asistente de creación de combo
   */
  openNewBundleWizard(): void {
    this.isWizardVisible.set(true);
  }

  /**
   * Callback ejecutado al completar la creación de un combo
   */
  onBundleCreated(bundle: BundleWithItems): void {
    console.log('Nuevo combo creado exitosamente:', bundle);
  }
}

