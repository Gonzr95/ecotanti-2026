import {
  Component,
  OnInit,
  computed,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from '@openng/optimus-ui/dialog';
import { ProgressBar } from '@openng/optimus-ui/progressbar';
import { Select } from '@openng/optimus-ui/select';
import { InputText } from '@openng/optimus-ui/inputtext';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { Button } from '@openng/optimus-ui/button';
import { Toast } from '@openng/optimus-ui/toast';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Brand,
  BrandsService,
  CategoriesService,
  Category,
  Product,
  ProductsService,
} from '@ecotanti/shared-catalog';

@Component({
  selector: 'app-product-create-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Dialog,
    ProgressBar,
    Select,
    InputText,
    InputNumber,
    Textarea,
    ToggleSwitch,
    Button,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './product-create-wizard.html',
})
export class ProductCreateWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly brandsService = inject(BrandsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly productsService = inject(ProductsService);
  private readonly messageService = inject(MessageService);

  /**
   * Visibilidad del modal enlazada bidireccionalmente
   */
  readonly visible = model<boolean>(false);

  /**
   * Emite el producto recién creado
   */
  readonly productCreated = output<Product>();

  // Estados reactivos de datos
  readonly brands = signal<Brand[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoadingDependencies = signal<boolean>(false);

  // Estados del Wizard
  readonly currentStep = signal<number>(1);
  readonly totalSteps = 5;
  readonly MAX_IMAGES = 3;
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingImage = signal<boolean>(false);
  readonly isCreatingCategory = signal<boolean>(false);
  readonly isSuccessModalVisible = signal<boolean>(false);
  readonly createdProductName = signal<string>('');

  // Estados de imágenes
  readonly images = signal<string[]>([]);
  readonly imageUrlInput = signal<string>('');

  // Creación rápida inline de categoría
  readonly isInlineCategoryOpen = signal<boolean>(false);
  readonly inlineCategoryName = signal<string>('');

  // Formulario Reactivo
  readonly productForm = this.fb.group({
    // Paso 1: Básicos
    name: ['', [Validators.required, Validators.minLength(2)]],
    brand_id: [null as number | null, [Validators.required]],
    description: [''],

    // Paso 2: Precios
    base_price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    cost_price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    sale_price: [null as number | null],

    // Paso 3: Stock y Categoría
    stock: [0, [Validators.required, Validators.min(0)]],
    category_id: [null as number | null, [Validators.required]],

    // Paso 5: Flags
    is_active: [true],
    is_highlight: [false],
    is_on_sale: [false],
  });

  // Títulos de los pasos
  readonly stepTitles: Record<number, string> = {
    1: 'Información Básica',
    2: 'Precios y Rentabilidad',
    3: 'Stock y Categorías',
    4: 'Imágenes del Producto',
    5: 'Estados y Confirmación',
  };

  // Cálculo reactivo de progreso
  readonly progressPercentage = computed(() => {
    return Math.round((this.currentStep() / this.totalSteps) * 100);
  });

  readonly currentStepTitle = computed(() => {
    return this.stepTitles[this.currentStep()] ?? '';
  });

  // Cálculos en vivo de margen y ganancias
  readonly calculatedGrossProfit = computed(() => {
    const base = Number(this.productForm.controls.base_price.value ?? 0);
    const cost = Number(this.productForm.controls.cost_price.value ?? 0);
    if (base > 0 && cost > 0) {
      return base - cost;
    }
    return null;
  });

  readonly calculatedMarginPercent = computed(() => {
    const base = Number(this.productForm.controls.base_price.value ?? 0);
    const cost = Number(this.productForm.controls.cost_price.value ?? 0);
    if (base > 0 && cost > 0) {
      return ((base - cost) / base) * 100;
    }
    return null;
  });

  readonly calculatedSaleProfit = computed(() => {
    const sale = Number(this.productForm.controls.sale_price.value ?? 0);
    const cost = Number(this.productForm.controls.cost_price.value ?? 0);
    if (sale > 0 && cost > 0) {
      return sale - cost;
    }
    return null;
  });

  readonly calculatedSaleMarginPercent = computed(() => {
    const sale = Number(this.productForm.controls.sale_price.value ?? 0);
    const cost = Number(this.productForm.controls.cost_price.value ?? 0);
    if (sale > 0 && cost > 0) {
      return ((sale - cost) / sale) * 100;
    }
    return null;
  });

  // Helpers para ficha de resumen (Paso 5)
  readonly selectedBrandName = computed(() => {
    const id = this.productForm.controls.brand_id.value;
    const found = this.brands().find((b) => b.id === id);
    return found ? found.name : 'Sin marca';
  });

  readonly selectedCategoryName = computed(() => {
    const id = this.productForm.controls.category_id.value;
    const found = this.categories().find((c) => c.id === id);
    return found ? found.name : 'Sin categoría';
  });

  ngOnInit(): void {
    this.loadDependencies();
  }

  async loadDependencies(): Promise<void> {
    this.isLoadingDependencies.set(true);
    try {
      const [brandsData, categoriesData] = await Promise.all([
        this.brandsService.getBrandsWithProductCount(),
        this.categoriesService.getCategories(),
      ]);
      // Filtrar solo marcas activas
      this.brands.set(brandsData.filter((b) => b.is_active));
      // Filtrar solo categorías activas
      this.categories.set(categoriesData.filter((c) => c.is_active));
    } catch (error) {
      console.error('Error al cargar dependencias del producto:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las marcas o categorías.',
      });
    } finally {
      this.isLoadingDependencies.set(false);
    }
  }

  // Validación y Navegación entre pasos
  canAdvanceStep(step: number): boolean {
    if (step === 1) {
      return (
        (this.productForm.controls.name.valid ?? false) &&
        (this.productForm.controls.brand_id.valid ?? false)
      );
    }
    if (step === 2) {
      const baseValid = this.productForm.controls.base_price.valid ?? false;
      const costValid = this.productForm.controls.cost_price.valid ?? false;
      const saleVal = this.productForm.controls.sale_price.value;
      const baseVal = this.productForm.controls.base_price.value;
      if (!baseValid || !costValid) return false;
      if (saleVal != null && saleVal > 0 && baseVal != null && saleVal >= baseVal) {
        return false;
      }
      return true;
    }
    if (step === 3) {
      return (
        (this.productForm.controls.category_id.valid ?? false) &&
        (this.productForm.controls.stock.valid ?? false)
      );
    }
    if (step === 4) {
      // Al menos 1 foto requerida para portada, máximo 3
      return this.images().length >= 1 && this.images().length <= this.MAX_IMAGES;
    }
    return true;
  }

  nextStep(): void {
    const step = this.currentStep();
    if (!this.canAdvanceStep(step)) {
      this.markStepControlsAsTouched(step);
      if (step === 4 && this.images().length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Foto requerida',
          detail: 'Debes cargar al menos 1 foto para el producto (con 1 es suficiente, hasta 3 fotos).',
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Campos requeridos',
          detail: 'Por favor completa los campos obligatorios antes de avanzar.',
        });
      }
      return;
    }

    if (step < this.totalSteps) {
      this.currentStep.set(step + 1);
    }
  }

  prevStep(): void {
    const step = this.currentStep();
    if (step > 1) {
      this.currentStep.set(step - 1);
    }
  }

  goToStep(targetStep: number): void {
    if (targetStep < this.currentStep()) {
      this.currentStep.set(targetStep);
    } else if (targetStep > this.currentStep()) {
      // Validar pasos intermedios
      for (let s = this.currentStep(); s < targetStep; s++) {
        if (!this.canAdvanceStep(s)) {
          this.markStepControlsAsTouched(s);
          return;
        }
      }
      this.currentStep.set(targetStep);
    }
  }

  private markStepControlsAsTouched(step: number): void {
    if (step === 1) {
      this.productForm.controls.name.markAsTouched();
      this.productForm.controls.brand_id.markAsTouched();
    } else if (step === 2) {
      this.productForm.controls.base_price.markAsTouched();
      this.productForm.controls.cost_price.markAsTouched();
      this.productForm.controls.sale_price.markAsTouched();
    } else if (step === 3) {
      this.productForm.controls.category_id.markAsTouched();
      this.productForm.controls.stock.markAsTouched();
    }
  }

  // Manejo de Imágenes (Paso 4)
  addImageUrl(): void {
    if (this.images().length >= this.MAX_IMAGES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite de imágenes',
        detail: `Solo puedes subir hasta ${this.MAX_IMAGES} fotos por producto.`,
      });
      return;
    }

    const url = this.imageUrlInput().trim();
    if (!url) return;
    this.images.update((prev) => [...prev, url]);
    this.imageUrlInput.set('');
  }

  removeImage(index: number): void {
    this.images.update((prev) => prev.filter((_, i) => i !== index));
  }

  setCoverImage(index: number): void {
    if (index <= 0 || index >= this.images().length) return;
    this.images.update((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  }

  async onFileSelected(event: Event): Promise<HTMLInputElement | void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (this.images().length >= this.MAX_IMAGES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite de imágenes',
        detail: `Solo puedes subir hasta ${this.MAX_IMAGES} fotos por producto.`,
      });
      input.value = '';
      return;
    }

    const file = input.files[0];
    this.isUploadingImage.set(true);

    try {
      const publicUrl = await this.productsService.uploadProductImage(file);
      this.images.update((prev) => [...prev, publicUrl]);
      this.messageService.add({
        severity: 'success',
        summary: 'Foto subida',
        detail: `Foto agregada (${this.images().length} de ${this.MAX_IMAGES}).`,
      });
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'No se pudo subir la imagen. Puedes ingresar una URL directa.',
      });
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  // Creación rápida de categoría inline (Paso 3)
  toggleInlineCategory(): void {
    this.isInlineCategoryOpen.update((v) => !v);
    this.inlineCategoryName.set('');
  }

  async saveInlineCategory(): Promise<void> {
    const name = this.inlineCategoryName().trim();
    if (!name) return;

    this.isCreatingCategory.set(true);
    try {
      const created = await this.categoriesService.createCategory({
        name,
        slug: '',
        is_active: true,
      });

      this.categories.update((prev) => [...prev, created]);
      this.productForm.controls.category_id.setValue(created.id);
      this.isInlineCategoryOpen.set(false);
      this.inlineCategoryName.set('');

      this.messageService.add({
        severity: 'success',
        summary: 'Categoría Creada',
        detail: `"${created.name}" fue creada y seleccionada.`,
      });
    } catch (error) {
      console.error('Error al crear categoría rápida:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear la categoría.',
      });
    } finally {
      this.isCreatingCategory.set(false);
    }
  }

  // Guardado Final de Producto
  async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario Incompleto',
        detail: 'Por favor revisa los campos requeridos en los pasos anteriores.',
      });
      return;
    }

    const formValues = this.productForm.getRawValue();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    this.isSaving.set(true);
    try {
      const createdProduct = await this.productsService.createProduct({
        name: formValues.name!.trim(),
        slug: '', // Autogenerado en segundo plano
        description: formValues.description?.trim() || null,
        base_price: Number(formValues.base_price),
        sale_price: formValues.sale_price != null ? Number(formValues.sale_price) : null,
        cost_price: Number(formValues.cost_price),
        stock: Number(formValues.stock ?? 0),
        category_id: formValues.category_id!,
        brand_id: formValues.brand_id!,
        images: this.images(),
        is_active: formValues.is_active ?? true,
        is_highlight: formValues.is_highlight ?? false,
        is_on_sale: formValues.is_on_sale ?? false,
      });

      this.productCreated.emit(createdProduct);
      this.createdProductName.set(createdProduct.name);

      if (isOnline) {
        this.messageService.add({
          severity: 'success',
          summary: 'Producto Registrado',
          detail: `"${createdProduct.name}" se guardó con éxito en el catálogo.`,
        });
      } else {
        this.messageService.add({
          severity: 'info',
          summary: 'Modo sin conexión',
          detail: 'El producto se guardó localmente y se sincronizará al recuperar la red.',
          life: 5000,
        });
      }

      // Desplegar diálogo post-guardado
      this.isSuccessModalVisible.set(true);
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      const detail = error?.message?.includes('duplicate key')
        ? 'Ya existe un producto con ese nombre.'
        : 'Ocurrió un error al registrar el producto en la base de datos.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail,
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  // Flujo Post-Guardado
  onRegisterAnother(): void {
    this.isSuccessModalVisible.set(false);
    this.resetWizard();
  }

  onFinishWizard(): void {
    this.isSuccessModalVisible.set(false);
    this.visible.set(false);
    this.resetWizard();
  }

  closeWizard(): void {
    this.visible.set(false);
    this.resetWizard();
  }

  resetWizard(): void {
    this.productForm.reset({
      name: '',
      brand_id: null,
      description: '',
      base_price: null,
      cost_price: null,
      sale_price: null,
      stock: 0,
      category_id: null,
      is_active: true,
      is_highlight: false,
      is_on_sale: false,
    });
    this.images.set([]);
    this.imageUrlInput.set('');
    this.currentStep.set(1);
    this.isInlineCategoryOpen.set(false);
    this.inlineCategoryName.set('');
  }
}

