import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
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
import { Textarea } from '@openng/optimus-ui/textarea';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { Button } from '@openng/optimus-ui/button';
import { DatePicker } from '@openng/optimus-ui/datepicker';
import { Toast } from '@openng/optimus-ui/toast';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Bundle,
  BundlesService,
  CreateOfferDto,
  CreateOfferItemDto,
  OfferItemDraft,
  OfferWithItems,
  OffersService,
  Product,
  ProductsService,
  UpdateOfferDto,
  slugify,
} from '@ecotanti/shared-catalog';

@Component({
  selector: 'app-offer-create-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Dialog,
    ProgressBar,
    Select,
    InputText,
    Textarea,
    ToggleSwitch,
    Button,
    DatePicker,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './offer-create-wizard.html',
})
export class OfferCreateWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly bundlesService = inject(BundlesService);
  private readonly offersService = inject(OffersService);
  private readonly messageService = inject(MessageService);

  /**
   * Visibilidad del diálogo bidireccional
   */
  readonly visible = model<boolean>(false);

  /**
   * Oferta para edición (si es null, estamos creando una nueva)
   */
  readonly offerToEdit = input<OfferWithItems | null>(null);

  /**
   * Evento emitido al crear o actualizar la oferta
   */
  readonly offerSaved = output<OfferWithItems>();

  /**
   * Navegación y progreso del wizard
   */
  readonly currentStep = signal<number>(1);
  readonly totalSteps = 4;

  readonly stepTitles: Record<number, string> = {
    1: 'Información y Banners',
    2: 'Vigencia y Difusión',
    3: 'Productos y Precios',
    4: 'Resumen y Confirmación',
  };

  readonly progressPercentage = computed(() => {
    return Math.round((this.currentStep() / this.totalSteps) * 100);
  });

  readonly currentStepTitle = computed(() => {
    return this.stepTitles[this.currentStep()] ?? '';
  });

  readonly isEditMode = computed(() => this.offerToEdit() !== null);

  /**
   * Banderas de estado
   */
  readonly isLoadingCatalog = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingBanner = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);

  /**
   * Catálogos para composición
   */
  readonly availableProducts = signal<Product[]>([]);
  readonly availableBundles = signal<Bundle[]>([]);

  readonly activeProducts = computed(() =>
    this.availableProducts().filter((p) => p.is_active)
  );

  readonly activeBundles = computed(() =>
    this.availableBundles().filter((b) => b.is_active)
  );

  /**
   * Imágenes de la oferta (Paso 1)
   */
  readonly bannerUrl = signal<string>('');
  readonly logoUrl = signal<string>('');
  readonly bannerUrlInput = signal<string>('');
  readonly logoUrlInput = signal<string>('');

  /**
   * Vigencia y teaser (Paso 2)
   */
  readonly dateRange = signal<Date[] | null>(null);
  readonly isTeaserEnabled = signal<boolean>(false);
  readonly teaserDate = signal<Date | null>(null);

  /**
   * Ítems de la oferta (Paso 3)
   */
  readonly selectedItemType = signal<'product' | 'bundle'>('product');
  readonly selectedProductIdToAdd = signal<number | null>(null);
  readonly selectedBundleIdToAdd = signal<number | null>(null);
  readonly offerPriceToAdd = signal<number | null>(null);
  readonly offerItems = signal<OfferItemDraft[]>([]);

  /**
   * Formulario reactivo
   */
  readonly offerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    discount_percentage: [null as number | null],
    is_active: [true],
  });

  /**
   * Cálculos agregados
   */
  readonly totalItemsCount = computed(() => this.offerItems().length);

  readonly totalRegularPrice = computed(() => {
    return this.offerItems().reduce((acc, item) => acc + Number(item.regular_price || 0), 0);
  });

  readonly totalOfferPrice = computed(() => {
    return this.offerItems().reduce((acc, item) => acc + Number(item.offer_price || 0), 0);
  });

  readonly totalSavings = computed(() => {
    const reg = this.totalRegularPrice();
    const off = this.totalOfferPrice();
    return Math.max(0, reg - off);
  });

  readonly averageDiscount = computed(() => {
    const reg = this.totalRegularPrice();
    const sav = this.totalSavings();
    if (reg <= 0 || sav <= 0) return 0;
    return Math.round((sav / reg) * 100);
  });

  constructor() {
    // Sincronizar el estado cuando cambia offerToEdit o se abre el wizard
    effect(() => {
      const editData = this.offerToEdit();
      const isOpen = this.visible();

      if (isOpen && editData) {
        this.populateForEdit(editData);
      } else if (!isOpen) {
        this.resetWizard();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  /**
   * Carga inventario de productos y combos
   */
  async loadCatalog(): Promise<void> {
    try {
      this.isLoadingCatalog.set(true);
      const [prods, bundles] = await Promise.all([
        this.productsService.getProducts(),
        this.bundlesService.getBundles(),
      ]);
      this.availableProducts.set(prods);
      this.availableBundles.set(bundles);
    } catch (error) {
      console.error('Error al cargar catálogo para ofertas:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los productos y combos.',
      });
    } finally {
      this.isLoadingCatalog.set(false);
    }
  }

  /**
   * Precarga los datos de una oferta existente para edición
   */
  private populateForEdit(offer: OfferWithItems): void {
    this.currentStep.set(1);
    this.offerForm.patchValue({
      name: offer.name,
      description: offer.description || '',
      discount_percentage: offer.discount_percentage,
      is_active: offer.is_active,
    });

    this.bannerUrl.set(offer.image_url || '');
    this.logoUrl.set(offer.logo_url || '');

    // Vigencia
    if (offer.valid_from && offer.valid_until) {
      this.dateRange.set([new Date(offer.valid_from), new Date(offer.valid_until)]);
    } else if (offer.valid_from) {
      this.dateRange.set([new Date(offer.valid_from)]);
    } else {
      this.dateRange.set(null);
    }

    // Teaser
    if (offer.promotion_starts_at) {
      this.isTeaserEnabled.set(true);
      this.teaserDate.set(new Date(offer.promotion_starts_at));
    } else {
      this.isTeaserEnabled.set(false);
      this.teaserDate.set(null);
    }

    // Mapear ítems existentes
    const mappedItems: OfferItemDraft[] = (offer.items || []).map((it) => {
      const isBundle = it.bundle_id != null;
      const regPrice = Number(
        isBundle ? it.bundle?.total_price ?? 0 : it.product?.base_price ?? 0
      );
      const offPrice = Number(it.price ?? regPrice);
      const discount =
        regPrice > 0 ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;

      return {
        type: isBundle ? 'bundle' : 'product',
        product_id: it.product_id,
        bundle_id: it.bundle_id,
        name: isBundle ? it.bundle?.name ?? 'Combo' : it.product?.name ?? 'Producto',
        image: isBundle
          ? it.bundle?.images?.[0] ?? null
          : it.product?.images?.[0] ?? null,
        regular_price: regPrice,
        offer_price: offPrice,
        calculated_discount: Math.max(0, discount),
        is_active: it.is_active,
      };
    });

    this.offerItems.set(mappedItems);
  }

  // ==========================================
  // PASO 1: Gestión de Banners y Logos
  // ==========================================

  setBannerUrl(url: string): void {
    this.bannerUrl.set(url.trim());
    this.bannerUrlInput.set('');
  }

  removeBanner(): void {
    this.bannerUrl.set('');
  }

  async onBannerFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      this.isUploadingBanner.set(true);
      const url = await this.offersService.uploadOfferImage(file);
      this.bannerUrl.set(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Banner cargado',
        detail: 'El banner de la campaña se subió correctamente.',
      });
    } catch (error: any) {
      console.error('Error al subir banner:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error de subida',
        detail: error?.message || 'No se pudo subir el banner.',
      });
    } finally {
      this.isUploadingBanner.set(false);
      input.value = '';
    }
  }

  setLogoUrl(url: string): void {
    this.logoUrl.set(url.trim());
    this.logoUrlInput.set('');
  }

  removeLogo(): void {
    this.logoUrl.set('');
  }

  async onLogoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      this.isUploadingLogo.set(true);
      const url = await this.offersService.uploadOfferImage(file);
      this.logoUrl.set(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Logo cargado',
        detail: 'La insignia o logo de la campaña se subió correctamente.',
      });
    } catch (error: any) {
      console.error('Error al subir logo:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error de subida',
        detail: error?.message || 'No se pudo subir el logo.',
      });
    } finally {
      this.isUploadingLogo.set(false);
      input.value = '';
    }
  }

  // ==========================================
  // PASO 3: Selección de Productos/Combos
  // ==========================================

  onItemSelectedToAdd(id: number | null): void {
    if (!id) {
      this.offerPriceToAdd.set(null);
      return;
    }

    const type = this.selectedItemType();
    let regularPrice = 0;

    if (type === 'product') {
      const prod = this.activeProducts().find((p) => p.id === id);
      regularPrice = Number(prod?.base_price || 0);
    } else {
      const bnd = this.activeBundles().find((b) => b.id === id);
      regularPrice = Number(bnd?.total_price || 0);
    }

    // Si la oferta tiene un descuento general definido, autocalcular sugerencia
    const campaignPct = Number(this.offerForm.controls.discount_percentage.value || 0);
    if (campaignPct > 0 && regularPrice > 0) {
      const calculated = Math.round(regularPrice - (regularPrice * campaignPct) / 100);
      this.offerPriceToAdd.set(calculated);
    } else {
      this.offerPriceToAdd.set(regularPrice);
    }
  }

  addItemToOffer(): void {
    const type = this.selectedItemType();
    const id = type === 'product' ? this.selectedProductIdToAdd() : this.selectedBundleIdToAdd();
    const offerPrice = this.offerPriceToAdd();

    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: `Debes seleccionar un ${type === 'product' ? 'producto' : 'combo'} para agregar.`,
      });
      return;
    }

    if (offerPrice == null || offerPrice <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Precio requerido',
        detail: 'Debes definir un precio de oferta válido mayor a $0.',
      });
      return;
    }

    // Verificar si ya existe en la lista
    const alreadyExists = this.offerItems().some(
      (it) => (type === 'product' && it.product_id === id) || (type === 'bundle' && it.bundle_id === id)
    );

    if (alreadyExists) {
      this.messageService.add({
        severity: 'info',
        summary: 'Ya agregado',
        detail: 'Este ítem ya se encuentra en la oferta.',
      });
      return;
    }

    let name = '';
    let image: string | null = null;
    let regularPrice = 0;

    if (type === 'product') {
      const prod = this.activeProducts().find((p) => p.id === id)!;
      name = prod.name;
      image = prod.images?.[0] ?? null;
      regularPrice = Number(prod.base_price || 0);
    } else {
      const bnd = this.activeBundles().find((b) => b.id === id)!;
      name = bnd.name;
      image = bnd.images?.[0] ?? null;
      regularPrice = Number(bnd.total_price || 0);
    }

    const discount =
      regularPrice > 0 ? Math.round(((regularPrice - offerPrice) / regularPrice) * 100) : 0;

    const draftItem: OfferItemDraft = {
      type,
      product_id: type === 'product' ? id : null,
      bundle_id: type === 'bundle' ? id : null,
      name,
      image,
      regular_price: regularPrice,
      offer_price: offerPrice,
      calculated_discount: Math.max(0, discount),
      is_active: true,
    };

    this.offerItems.update((prev) => [...prev, draftItem]);

    // Limpiar selección
    if (type === 'product') {
      this.selectedProductIdToAdd.set(null);
    } else {
      this.selectedBundleIdToAdd.set(null);
    }
    this.offerPriceToAdd.set(null);
  }

  removeItem(index: number): void {
    this.offerItems.update((prev) => prev.filter((_, i) => i !== index));
  }

  updateItemOfferPrice(index: number, newPrice: number | null): void {
    if (newPrice == null || newPrice <= 0) return;
    this.offerItems.update((items) =>
      items.map((it, idx) => {
        if (idx !== index) return it;
        const discount =
          it.regular_price > 0
            ? Math.round(((it.regular_price - newPrice) / it.regular_price) * 100)
            : 0;
        return {
          ...it,
          offer_price: newPrice,
          calculated_discount: Math.max(0, discount),
        };
      })
    );
  }

  toggleItemActive(index: number): void {
    this.offerItems.update((items) =>
      items.map((it, idx) => (idx === index ? { ...it, is_active: !it.is_active } : it))
    );
  }

  /**
   * Acción masiva: aplica el descuento general de la campaña a todos los ítems actuales
   */
  applyCampaignDiscountToAll(): void {
    const pct = Number(this.offerForm.controls.discount_percentage.value || 0);
    if (pct <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Descuento no definido',
        detail: 'Define un porcentaje de descuento de campaña mayor a 0% en el Paso 1.',
      });
      return;
    }

    this.offerItems.update((items) =>
      items.map((it) => {
        const calculated = Math.round(it.regular_price - (it.regular_price * pct) / 100);
        const finalPrice = Math.max(1, calculated);
        return {
          ...it,
          offer_price: finalPrice,
          calculated_discount: pct,
        };
      })
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Descuento aplicado',
      detail: `Se recalculó el ${pct}% de descuento para todos los ítems agregados.`,
    });
  }

  // ==========================================
  // NAVEGACIÓN Y VALIDACIÓN DEL WIZARD
  // ==========================================

  canAdvanceStep(step: number): boolean {
    if (step === 1) {
      return this.offerForm.controls.name.valid ?? false;
    }
    if (step === 2) {
      const range = this.dateRange();
      if (range && range.length === 2 && range[0] && range[1]) {
        if (range[1] < range[0]) return false;
      }
      return true;
    }
    if (step === 3) {
      return this.offerItems().length >= 1;
    }
    return true;
  }

  nextStep(): void {
    const step = this.currentStep();
    if (!this.canAdvanceStep(step)) {
      if (step === 1) {
        this.offerForm.controls.name.markAsTouched();
        this.messageService.add({
          severity: 'warn',
          summary: 'Nombre requerido',
          detail: 'Por favor ingresa un nombre para la oferta (mínimo 3 caracteres).',
        });
      } else if (step === 2) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Fechas inválidas',
          detail: 'La fecha de fin debe ser posterior o igual a la de inicio.',
        });
      } else if (step === 3 && this.offerItems().length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Ítems requeridos',
          detail: 'Debes agregar al menos 1 producto o combo a la oferta.',
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

  // ==========================================
  // GUARDADO / ACTUALIZACIÓN FINAL
  // ==========================================

  async saveOffer(): Promise<void> {
    if (!this.canAdvanceStep(1) || !this.canAdvanceStep(2) || !this.canAdvanceStep(3)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validación incompleta',
        detail: 'Por favor revisa que todos los pasos requeridos estén completos.',
      });
      return;
    }

    const formValues = this.offerForm.getRawValue();
    const range = this.dateRange();
    const validFrom = range?.[0] ? range[0].toISOString() : null;
    const validUntil = range?.[1] ? range[1].toISOString() : null;

    const promotionStartsAt =
      this.isTeaserEnabled() && this.teaserDate()
        ? this.teaserDate()!.toISOString()
        : null;

    const itemsDto: CreateOfferItemDto[] = this.offerItems().map((it) => ({
      product_id: it.product_id,
      bundle_id: it.bundle_id,
      price: it.offer_price,
      is_active: it.is_active,
    }));

    this.isSaving.set(true);

    try {
      const editTarget = this.offerToEdit();

      if (editTarget) {
        const updateDto: UpdateOfferDto = {
          name: formValues.name!.trim(),
          description: formValues.description?.trim() || null,
          image_url: this.bannerUrl() || null,
          logo_url: this.logoUrl() || null,
          promotion_starts_at: promotionStartsAt,
          valid_from: validFrom,
          valid_until: validUntil,
          discount_percentage:
            formValues.discount_percentage != null
              ? Number(formValues.discount_percentage)
              : null,
          is_active: formValues.is_active ?? true,
        };

        const updated = await this.offersService.updateOffer(
          editTarget.id,
          updateDto,
          itemsDto
        );

        this.messageService.add({
          severity: 'success',
          summary: 'Oferta Actualizada',
          detail: `La oferta "${updated.name}" fue actualizada exitosamente.`,
        });

        this.offerSaved.emit(updated);
        this.closeWizard();
      } else {
        const createDto: CreateOfferDto = {
          name: formValues.name!.trim(),
          slug: slugify(formValues.name!.trim()),
          description: formValues.description?.trim() || null,
          image_url: this.bannerUrl() || null,
          logo_url: this.logoUrl() || null,
          promotion_starts_at: promotionStartsAt,
          valid_from: validFrom,
          valid_until: validUntil,
          discount_percentage:
            formValues.discount_percentage != null
              ? Number(formValues.discount_percentage)
              : null,
          is_active: formValues.is_active ?? true,
        };

        const created = await this.offersService.createOffer(createDto, itemsDto);

        this.messageService.add({
          severity: 'success',
          summary: 'Oferta Creada',
          detail: `La oferta "${created.name}" fue creada exitosamente.`,
        });

        this.offerSaved.emit(created);
        this.closeWizard();
      }
    } catch (error: any) {
      console.error('Error al guardar oferta:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.message || 'Ocurrió un error al guardar la oferta.',
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
    this.offerForm.reset({
      name: '',
      description: '',
      discount_percentage: null,
      is_active: true,
    });
    this.bannerUrl.set('');
    this.logoUrl.set('');
    this.bannerUrlInput.set('');
    this.logoUrlInput.set('');
    this.dateRange.set(null);
    this.isTeaserEnabled.set(false);
    this.teaserDate.set(null);
    this.selectedItemType.set('product');
    this.selectedProductIdToAdd.set(null);
    this.selectedBundleIdToAdd.set(null);
    this.offerPriceToAdd.set(null);
    this.offerItems.set([]);
  }
}

