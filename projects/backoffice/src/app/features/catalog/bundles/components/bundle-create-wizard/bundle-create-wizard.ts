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
  BundleItemDraft,
  BundleWithItems,
  BundlesService,
  CreateBundleDto,
  CreateBundleItemDto,
  Product,
  ProductsService,
  slugify,
} from '@ecotanti/shared-catalog';

@Component({
  selector: 'app-bundle-create-wizard',
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
  templateUrl: './bundle-create-wizard.html',
})
export class BundleCreateWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly bundlesService = inject(BundlesService);
  private readonly messageService = inject(MessageService);

  /**
   * Visibilidad del diálogo vinculada bidireccionalmente
   */
  readonly visible = model<boolean>(false);

  /**
   * Evento emitido cuando el combo se crea exitosamente
   */
  readonly bundleCreated = output<BundleWithItems>();

  /**
   * Paso actual del asistente (1 al 5)
   */
  readonly currentStep = signal<number>(1);
  readonly totalSteps = 5;

  /**
   * Límites y banderas de carga
   */
  readonly MAX_IMAGES = 3;
  readonly isLoadingProducts = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingImage = signal<boolean>(false);

  /**
   * Catálogo de productos disponibles para componer combos
   */
  readonly availableProducts = signal<Product[]>([]);

  /**
   * Productos activos elegibles
   */
  readonly activeProducts = computed(() => {
    return this.availableProducts().filter((p) => p.is_active);
  });

  /**
   * Estado de selección de producto en Paso 2
   */
  readonly selectedProductIdToAdd = signal<number | null>(null);
  readonly quantityToAdd = signal<number>(1);

  /**
   * Lista de productos que componen el combo
   */
  readonly comboItems = signal<BundleItemDraft[]>([]);

  /**
   * Galería de imágenes cargadas (Paso 4)
   */
  readonly images = signal<string[]>([]);
  readonly imageUrlInput = signal<string>('');

  readonly pricingMode = signal<'manual' | 'percentage'>('manual');
  readonly manualPrice = signal<number | null>(null);
  readonly discountPercentage = signal<number | null>(null);

  /**
   * Formulario reactivo del combo
   */
  readonly bundleForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: [''],
    description: [''],
    is_active: [true],
    pricing_mode: ['manual' as 'manual' | 'percentage', [Validators.required]],
    manual_price: [null as number | null],
    discount_percentage: [null as number | null],
    valid_from: [null as string | null],
    valid_until: [null as string | null],
  });

  /**
   * Títulos de cada paso del asistente
   */
  readonly stepTitles: Record<number, string> = {
    1: 'Información Básica',
    2: 'Composición del Combo',
    3: 'Fijación del Precio Promocional',
    4: 'Imágenes del Combo',
    5: 'Vigencia y Confirmación',
  };

  /**
   * Porcentaje de progreso reactivo
   */
  readonly progressPercentage = computed(() => {
    return Math.round((this.currentStep() / this.totalSteps) * 100);
  });

  readonly currentStepTitle = computed(() => {
    return this.stepTitles[this.currentStep()] ?? '';
  });

  /**
   * Valor regular acumulado de lista de todos los productos en el combo
   */
  readonly totalRegularPrice = computed(() => {
    return this.comboItems().reduce((acc, item) => {
      return acc + Number(item.product.base_price ?? 0) * item.quantity;
    }, 0);
  });

  /**
   * Precio final calculado del combo según el modo seleccionado
   */
  readonly finalComboPrice = computed(() => {
    const mode = this.pricingMode();
    const regular = this.totalRegularPrice();

    if (mode === 'percentage') {
      const pct = Number(this.discountPercentage() ?? 0);
      if (pct <= 0) return regular;
      const discounted = regular - (regular * pct) / 100;
      return Math.max(0, Math.round(discounted));
    }

    return Number(this.manualPrice() ?? 0);
  });

  /**
   * Ahorro neto en pesos para el cliente
   */
  readonly calculatedSavings = computed(() => {
    const regular = this.totalRegularPrice();
    const finalPrice = this.finalComboPrice();
    return regular > finalPrice ? regular - finalPrice : 0;
  });

  /**
   * Porcentaje equivalente de descuento (OFF)
   */
  readonly calculatedEquivalentDiscount = computed(() => {
    const regular = this.totalRegularPrice();
    if (regular <= 0) return 0;
    const savings = this.calculatedSavings();
    return Math.round((savings / regular) * 100);
  });

  /**
   * Advertencia informativa si el precio no ofrece un ahorro de lista
   */
  readonly pricingWarning = computed(() => {
    const regular = this.totalRegularPrice();
    const finalPrice = this.finalComboPrice();
    if (regular > 0 && finalPrice >= regular) {
      return 'El precio final del combo es igual o mayor al valor de lista regular acumulado.';
    }
    return null;
  });

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  /**
   * Carga la lista de productos del inventario
   */
  async loadProducts(): Promise<void> {
    try {
      this.isLoadingProducts.set(true);
      const data = await this.productsService.getProducts();
      this.availableProducts.set(data);
    } catch (error) {
      console.error('Error al cargar productos para combos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los productos del inventario.',
      });
    } finally {
      this.isLoadingProducts.set(false);
    }
  }

  /**
   * Autogenera el slug si el usuario no ingresó uno manual
   */
  onNameBlur(): void {
    const currentName = this.bundleForm.controls.name.value;
    const currentSlug = this.bundleForm.controls.slug.value;
    if (currentName && !currentSlug) {
      this.bundleForm.controls.slug.setValue(slugify(currentName));
    }
  }

  // ==========================================
  // PASO 2: Composición del Combo
  // ==========================================

  addProductToCombo(): void {
    const prodId = this.selectedProductIdToAdd();
    const qty = Math.max(1, this.quantityToAdd());

    if (!prodId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Por favor selecciona un producto del inventario.',
      });
      return;
    }

    const product = this.availableProducts().find((p) => p.id === prodId);
    if (!product) return;

    this.comboItems.update((current) => {
      const existingIndex = current.findIndex((item) => item.product.id === prodId);
      if (existingIndex >= 0) {
        // Incrementar cantidad automáticamente
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }
      return [...current, { product, quantity: qty }];
    });

    // Resetear campos de selección
    this.selectedProductIdToAdd.set(null);
    this.quantityToAdd.set(1);
  }

  incrementItemQuantity(index: number): void {
    this.comboItems.update((current) => {
      const updated = [...current];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity + 1,
        };
      }
      return updated;
    });
  }

  decrementItemQuantity(index: number): void {
    this.comboItems.update((current) => {
      const updated = [...current];
      if (updated[index] && updated[index].quantity > 1) {
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity - 1,
        };
      }
      return updated;
    });
  }

  removeItem(index: number): void {
    this.comboItems.update((current) => current.filter((_, i) => i !== index));
  }

  // ==========================================
  // PASO 3: Fijación de Precio
  // ==========================================

  setPricingMode(mode: 'manual' | 'percentage'): void {
    this.pricingMode.set(mode);
    this.bundleForm.controls.pricing_mode.setValue(mode);
    const regular = this.totalRegularPrice();

    if (mode === 'percentage') {
      const manual = Number(this.manualPrice() ?? 0);
      if (manual > 0 && regular > manual) {
        const pct = Math.round(((regular - manual) / regular) * 100);
        this.setDiscountPercentage(pct);
      }
    } else {
      const pct = Number(this.discountPercentage() ?? 0);
      if (pct > 0 && regular > 0) {
        const manual = Math.round(regular - (regular * pct) / 100);
        this.setManualPrice(manual);
      }
    }
  }

  setManualPrice(value: number | null): void {
    this.manualPrice.set(value);
    this.bundleForm.controls.manual_price.setValue(value);
  }

  setDiscountPercentage(value: number | null): void {
    this.discountPercentage.set(value);
    this.bundleForm.controls.discount_percentage.setValue(value);
  }

  // ==========================================
  // PASO 4: Carga de Imágenes
  // ==========================================

  addImageUrl(): void {
    if (this.images().length >= this.MAX_IMAGES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Solo se admiten hasta ${this.MAX_IMAGES} fotos por combo.`,
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

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (this.images().length >= this.MAX_IMAGES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Solo se admiten hasta ${this.MAX_IMAGES} fotos por combo.`,
      });
      input.value = '';
      return;
    }

    const file = input.files[0];
    try {
      this.isUploadingImage.set(true);
      const publicUrl = await this.bundlesService.uploadBundleImage(file);
      this.images.update((prev) => [...prev, publicUrl]);
      this.messageService.add({
        severity: 'success',
        summary: 'Imagen cargada',
        detail: 'La imagen del combo se subió correctamente.',
      });
    } catch (error) {
      console.error('Error al subir imagen de combo:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error de subida',
        detail: 'No se pudo subir la imagen al almacenamiento.',
      });
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  // ==========================================
  // NAVEGACIÓN Y VALIDACIÓN DEL WIZARD
  // ==========================================

  canAdvanceStep(step: number): boolean {
    if (step === 1) {
      return this.bundleForm.controls.name.valid ?? false;
    }
    if (step === 2) {
      return this.comboItems().length >= 1;
    }
    if (step === 3) {
      const mode = this.pricingMode();
      if (mode === 'percentage') {
        const pct = this.discountPercentage();
        return pct != null && pct >= 0 && pct <= 100 && this.finalComboPrice() > 0;
      }
      const price = this.manualPrice();
      return price != null && price > 0;
    }
    if (step === 4) {
      return this.images().length >= 1 && this.images().length <= this.MAX_IMAGES;
    }
    if (step === 5) {
      const from = this.bundleForm.controls.valid_from.value;
      const until = this.bundleForm.controls.valid_until.value;
      if (from && until) {
        return new Date(until) >= new Date(from);
      }
      return true;
    }
    return true;
  }

  nextStep(): void {
    const step = this.currentStep();
    if (!this.canAdvanceStep(step)) {
      this.markStepControlsAsTouched(step);
      if (step === 2 && this.comboItems().length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Productos requeridos',
          detail: 'Debes agregar al menos 1 producto para componer el combo.',
        });
      } else if (step === 3 && this.finalComboPrice() <= 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Precio inválido',
          detail: 'Debes definir un precio especial mayor a $0 para el combo.',
        });
      } else if (step === 4 && this.images().length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Foto requerida',
          detail: 'Debes cargar al menos 1 foto para el combo (hasta 3 fotos).',
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Campos incompletos',
          detail: 'Por favor completa los campos obligatorios antes de continuar.',
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

  private markStepControlsAsTouched(step: number): void {
    if (step === 1) {
      this.bundleForm.controls.name.markAsTouched();
    } else if (step === 3) {
      this.bundleForm.controls.manual_price.markAsTouched();
      this.bundleForm.controls.discount_percentage.markAsTouched();
    }
  }

  // ==========================================
  // CONFIRMACIÓN Y GUARDADO FINAL
  // ==========================================

  async saveBundle(): Promise<void> {
    if (!this.canAdvanceStep(1) || !this.canAdvanceStep(2) || !this.canAdvanceStep(3) || !this.canAdvanceStep(4)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validación incompleta',
        detail: 'Por favor revisa que todos los pasos requeridos estén completos.',
      });
      return;
    }

    const formValues = this.bundleForm.getRawValue();
    const finalPrice = this.finalComboPrice();
    const discountPct = this.calculatedEquivalentDiscount();

    const bundleDto: CreateBundleDto = {
      name: formValues.name!.trim(),
      slug: formValues.slug?.trim() || slugify(formValues.name!),
      description: formValues.description?.trim() || null,
      total_price: finalPrice,
      discount_percentage: discountPct > 0 ? discountPct : null,
      images: this.images(),
      valid_from: formValues.valid_from ? new Date(formValues.valid_from).toISOString() : null,
      valid_until: formValues.valid_until ? new Date(formValues.valid_until).toISOString() : null,
      is_active: formValues.is_active ?? true,
    };

    const itemsDto: CreateBundleItemDto[] = this.comboItems().map((it) => ({
      product_id: it.product.id,
      quantity: it.quantity,
    }));

    try {
      this.isSaving.set(true);
      const created = await this.bundlesService.createBundle(bundleDto, itemsDto);
      this.messageService.add({
        severity: 'success',
        summary: 'Combo Creado',
        detail: `El combo "${created.name}" fue creado exitosamente.`,
      });
      this.bundleCreated.emit(created);
      this.closeWizard();
    } catch (error) {
      console.error('Error al guardar combo:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al guardar el combo en la base de datos.',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  closeWizard(): void {
    this.visible.set(false);
    this.resetWizard();
  }

  private resetWizard(): void {
    this.currentStep.set(1);
    this.bundleForm.reset({
      name: '',
      slug: '',
      description: '',
      is_active: true,
      pricing_mode: 'manual',
      manual_price: null,
      discount_percentage: null,
      valid_from: null,
      valid_until: null,
    });
    this.pricingMode.set('manual');
    this.manualPrice.set(null);
    this.discountPercentage.set(null);
    this.comboItems.set([]);
    this.images.set([]);
    this.imageUrlInput.set('');
    this.selectedProductIdToAdd.set(null);
    this.quantityToAdd.set(1);
  }
}

