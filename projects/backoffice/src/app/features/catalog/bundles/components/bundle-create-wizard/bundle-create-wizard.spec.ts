import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import {
  BundlesService,
  BundleWithItems,
  Product,
  ProductsService,
} from '@ecotanti/shared-catalog';
import { BundleCreateWizardComponent } from './bundle-create-wizard';

describe('BundleCreateWizardComponent', () => {
  let component: BundleCreateWizardComponent;
  let fixture: ComponentFixture<BundleCreateWizardComponent>;
  let productsServiceMock: {
    getProducts: ReturnType<typeof vi.fn>;
  };
  let bundlesServiceMock: {
    createBundle: ReturnType<typeof vi.fn>;
    uploadBundleImage: ReturnType<typeof vi.fn>;
  };

  const mockProducts: Product[] = [
    {
      id: 1,
      name: 'Alfajor Gula',
      slug: 'alfajor-gula',
      description: null,
      base_price: 3500,
      sale_price: null,
      cost_price: 2000,
      stock: 50,
      category_id: 1,
      brand_id: 1,
      images: ['https://example.com/alfajor.jpg'],
      is_active: true,
      is_highlight: false,
      is_on_sale: false,
      applies_discount: true,
      points_required: null,
      created_at: '',
      updated_at: null,
    },
    {
      id: 2,
      name: 'Inca Kola 500ml',
      slug: 'inca-kola',
      description: null,
      base_price: 3000,
      sale_price: null,
      cost_price: 1800,
      stock: 30,
      category_id: 2,
      brand_id: 2,
      images: ['https://example.com/gaseosa.jpg'],
      is_active: true,
      is_highlight: false,
      is_on_sale: false,
      applies_discount: true,
      points_required: null,
      created_at: '',
      updated_at: null,
    },
  ];

  beforeEach(async () => {
    productsServiceMock = {
      getProducts: vi.fn().mockResolvedValue(mockProducts),
    };
    bundlesServiceMock = {
      createBundle: vi.fn().mockResolvedValue({
        id: 99,
        name: 'Combo Pareja',
        slug: 'combo-pareja',
        description: '2 alfajores y 1 gaseosa',
        total_price: 9000,
        discount_percentage: 10,
        images: ['https://example.com/combo.jpg'],
        valid_from: null,
        valid_until: null,
        is_active: true,
        created_at: '',
        updated_at: null,
        items: [],
      } as BundleWithItems),
      uploadBundleImage: vi.fn().mockResolvedValue('https://example.com/uploaded.jpg'),
    };

    await TestBed.configureTestingModule({
      imports: [BundleCreateWizardComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
        MessageService,
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: BundlesService, useValue: bundlesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BundleCreateWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize at Step 1 with 20% progress and load available products', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep()).toBe(1);
    expect(component.progressPercentage()).toBe(20);
    expect(component.availableProducts().length).toBe(2);
    expect(component.activeProducts().length).toBe(2);
  });

  it('should validate Step 1 (name required with min length 3)', () => {
    expect(component.canAdvanceStep(1)).toBe(false);

    component.bundleForm.controls.name.setValue('Co');
    expect(component.canAdvanceStep(1)).toBe(false);

    component.bundleForm.controls.name.setValue('Combo Pareja');
    component.onNameBlur();
    expect(component.bundleForm.controls.slug.value).toBe('combo-pareja');
    expect(component.canAdvanceStep(1)).toBe(true);
  });

  it('should manage bundle composition, auto-increment existing product and calculate subtotals in Step 2', () => {
    component.currentStep.set(2);
    expect(component.canAdvanceStep(2)).toBe(false);

    // Seleccionar y agregar Alfajor Gula (cant 1)
    component.selectedProductIdToAdd.set(1);
    component.quantityToAdd.set(1);
    component.addProductToCombo();

    expect(component.comboItems().length).toBe(1);
    expect(component.comboItems()[0].quantity).toBe(1);
    expect(component.totalRegularPrice()).toBe(3500);
    expect(component.canAdvanceStep(2)).toBe(true);

    // Agregar el mismo producto con cantidad 2 (debe sumar a 3)
    component.selectedProductIdToAdd.set(1);
    component.quantityToAdd.set(2);
    component.addProductToCombo();

    expect(component.comboItems().length).toBe(1);
    expect(component.comboItems()[0].quantity).toBe(3);
    expect(component.totalRegularPrice()).toBe(10500);

    // Agregar Inca Kola (cant 1)
    component.selectedProductIdToAdd.set(2);
    component.quantityToAdd.set(1);
    component.addProductToCombo();

    expect(component.comboItems().length).toBe(2);
    expect(component.totalRegularPrice()).toBe(13500);

    // Decrementar cantidad del primer producto
    component.decrementItemQuantity(0);
    expect(component.comboItems()[0].quantity).toBe(2);
    expect(component.totalRegularPrice()).toBe(10000);

    // Eliminar Inca Kola
    component.removeItem(1);
    expect(component.comboItems().length).toBe(1);
    expect(component.totalRegularPrice()).toBe(7000);
  });

  it('should calculate savings and equivalent discount in Step 3 for Manual and Percentage modes', () => {
    // Componer con 2 alfajores ($3500 x 2 = $7000)
    component.selectedProductIdToAdd.set(1);
    component.quantityToAdd.set(2);
    component.addProductToCombo();

    component.currentStep.set(3);
    expect(component.totalRegularPrice()).toBe(7000);

    // 1. Modo Manual
    component.setPricingMode('manual');
    expect(component.canAdvanceStep(3)).toBe(false);

    component.setManualPrice(6000);
    expect(component.canAdvanceStep(3)).toBe(true);
    expect(component.finalComboPrice()).toBe(6000);
    expect(component.calculatedSavings()).toBe(1000);
    expect(component.calculatedEquivalentDiscount()).toBe(14); // ~14% OFF

    // 2. Modo Porcentaje (20% OFF de $7000 = $1400 ahorro, final $5600)
    component.setPricingMode('percentage');
    component.setDiscountPercentage(20);
    expect(component.canAdvanceStep(3)).toBe(true);
    expect(component.finalComboPrice()).toBe(5600);
    expect(component.calculatedSavings()).toBe(1400);
    expect(component.calculatedEquivalentDiscount()).toBe(20);
  });

  it('should enforce 1-3 images limit and cover selection in Step 4', () => {
    component.currentStep.set(4);
    // Requiere al menos 1 imagen
    expect(component.canAdvanceStep(4)).toBe(false);

    // Agregar 1ra imagen
    component.imageUrlInput.set('https://example.com/c1.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(1);
    expect(component.canAdvanceStep(4)).toBe(true);

    // Agregar 2da y 3ra imagen
    component.imageUrlInput.set('https://example.com/c2.jpg');
    component.addImageUrl();
    component.imageUrlInput.set('https://example.com/c3.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(3);
    expect(component.canAdvanceStep(4)).toBe(true);

    // Intento de 4ta imagen bloqueado
    component.imageUrlInput.set('https://example.com/c4.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(3);

    // Cambiar portada
    component.setCoverImage(1);
    expect(component.images()[0]).toBe('https://example.com/c2.jpg');

    // Eliminar fotos
    component.removeImage(0);
    expect(component.images().length).toBe(2);
  });

  it('should save the complete bundle and emit bundleCreated', async () => {
    // Paso 1
    component.bundleForm.controls.name.setValue('Combo Pareja');
    component.bundleForm.controls.slug.setValue('combo-pareja');

    // Paso 2
    component.selectedProductIdToAdd.set(1);
    component.quantityToAdd.set(2);
    component.addProductToCombo();

    // Paso 3
    component.setPricingMode('manual');
    component.setManualPrice(6000);

    // Paso 4
    component.images.set(['https://example.com/combo.jpg']);

    component.currentStep.set(5);

    let emittedBundle: BundleWithItems | undefined;
    component.bundleCreated.subscribe((b) => (emittedBundle = b));

    await component.saveBundle();

    expect(bundlesServiceMock.createBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Combo Pareja',
        slug: 'combo-pareja',
        total_price: 6000,
        images: ['https://example.com/combo.jpg'],
      }),
      expect.arrayContaining([
        expect.objectContaining({
          product_id: 1,
          quantity: 2,
        }),
      ])
    );
    expect(emittedBundle?.id).toBe(99);
    expect(component.visible()).toBe(false);
  });
});

