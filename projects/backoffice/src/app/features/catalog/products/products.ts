import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '@openng/optimus-ui/button';
import { Product } from '@ecotanti/shared-catalog';
import { ProductCreateWizardComponent } from './components/product-create-wizard/product-create-wizard';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, Button, ProductCreateWizardComponent],
  templateUrl: './products.html',
})
export class ProductsComponent {
  readonly isWizardVisible = signal<boolean>(false);

  openNewProductWizard(): void {
    this.isWizardVisible.set(true);
  }

  onProductCreated(product: Product): void {
    console.log('Nuevo producto creado en el catálogo:', product);
  }
}

