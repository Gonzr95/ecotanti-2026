import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Bundle,
  BundlesService,
  OfferWithItems,
  OffersService,
  Product,
  ProductsService,
} from '@ecotanti/shared-catalog';
import { OfferCreateWizardComponent } from './offer-create-wizard';

describe('OfferCreateWizardComponent', () => {
  let component: OfferCreateWizardComponent;
  let fixture: ComponentFixture<OfferCreateWizardComponent>;
  let productsServiceMock: {
    getProducts: ReturnType<typeof vi.fn>;
  };
  let bundlesServiceMock: {
    getBundles: ReturnType<typeof vi.fn>;
  };
  let offersServiceMock: {
    createOffer: ReturnType<typeof vi.fn>;
    updateOffer: ReturnType<typeof vi.fn>;
    uploadOfferImage: ReturnType<typeof vi.fn>;
  };

  const mockProducts: Product[] = [
    {
      id: 1,
      name: 'Alfajor Triple',
      slug: 'alfajor-triple',
      description: null,
      base_price: 3000,
      sale_price: null,
      cost_price: 1500,
      stock: 40,
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
  ];

  const mockBundles: Bundle[] = [
    {
      id: 10,
      name: 'Pack 4 Alfajores',
      slug: 'pack-4-alfajores',
      description: null,
      total_price: 10000,
      discount_percentage: 15,
      images: ['https://example.com/pack.jpg'],
      valid_from: null,
      valid_until: null,
      is_active: true,
      created_at: '',
      updated_at: null,
    },
  ];

  beforeEach(async () => {
    productsServiceMock = {
      getProducts: vi.fn().mockResolvedValue(mockProducts),
    };
    bundlesServiceMock = {
      getBundles: vi.fn().mockResolvedValue(mockBundles),
    };
    offersServiceMock = {
      createOffer: vi.fn().mockResolvedValue({
        id: 77,
        name: 'CyberWeek',
        slug: 'cyberweek',
        description: null,
        image_url: 'https://example.com/banner.jpg',
        logo_url: null,
        promotion_starts_at: null,
        valid_from: null,
        valid_until: null,
        discount_percentage: 20,
        is_active: true,
        created_at: '',
        updated_at: null,
        items: [],
      } as OfferWithItems),
      updateOffer: vi.fn().mockResolvedValue({
        id: 77,
        name: 'CyberWeek Modificada',
        slug: 'cyberweek-modificada',
        description: null,
        image_url: null,
        logo_url: null,
        promotion_starts_at: null,
        valid_from: null,
        valid_until: null,
        discount_percentage: 25,
        is_active: true,
        created_at: '',
        updated_at: null,
        items: [],
      } as OfferWithItems),
      uploadOfferImage: vi.fn().mockResolvedValue('https://example.com/uploaded-banner.jpg'),
    };

    await TestBed.configureTestingModule({
      imports: [OfferCreateWizardComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
        MessageService,
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: BundlesService, useValue: bundlesServiceMock },
        { provide: OffersService, useValue: offersServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfferCreateWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize at Step 1 with 25% progress and load catalog products and bundles', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep()).toBe(1);
    expect(component.progressPercentage()).toBe(25);
    expect(component.availableProducts().length).toBe(1);
    expect(component.availableBundles().length).toBe(1);
  });

  it('should validate Step 1 (name required with min length 3)', () => {
    expect(component.canAdvanceStep(1)).toBe(false);

    component.offerForm.controls.name.setValue('Cy');
    expect(component.canAdvanceStep(1)).toBe(false);

    component.offerForm.controls.name.setValue('CyberWeek EcoTanti');
    expect(component.canAdvanceStep(1)).toBe(true);
  });

  it('should link and upload banner and logo in Step 1', async () => {
    // Banner por URL
    component.setBannerUrl('https://example.com/banner.jpg');
    expect(component.bannerUrl()).toBe('https://example.com/banner.jpg');
    component.removeBanner();
    expect(component.bannerUrl()).toBe('');

    // Banner por archivo
    const file = new File(['test'], 'banner.png', { type: 'image/png' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;
    await component.onBannerFileSelected(event);
    expect(offersServiceMock.uploadOfferImage).toHaveBeenCalledWith(file);
    expect(component.bannerUrl()).toBe('https://example.com/uploaded-banner.jpg');
  });

  it('should validate Step 2 dateRange and teaser', () => {
    component.currentStep.set(2);
    // Válido sin fechas (vigencia indefinida)
    expect(component.canAdvanceStep(2)).toBe(true);

    // Con rango válido
    const from = new Date('2026-11-01T10:00:00Z');
    const until = new Date('2026-11-05T10:00:00Z');
    component.dateRange.set([from, until]);
    expect(component.canAdvanceStep(2)).toBe(true);

    // Con rango invertido
    component.dateRange.set([until, from]);
    expect(component.canAdvanceStep(2)).toBe(false);
  });

  it('should add products and bundles and calculate discounts in Step 3', () => {
    component.currentStep.set(3);
    expect(component.canAdvanceStep(3)).toBe(false);

    // 1. Agregar Alfajor Triple ($3000) a $2400 (20% OFF)
    component.selectedItemType.set('product');
    component.selectedProductIdToAdd.set(1);
    component.offerPriceToAdd.set(2400);
    component.addItemToOffer();

    expect(component.offerItems().length).toBe(1);
    expect(component.offerItems()[0].name).toBe('Alfajor Triple');
    expect(component.offerItems()[0].calculated_discount).toBe(20);
    expect(component.canAdvanceStep(3)).toBe(true);

    // 2. Agregar Pack 4 Alfajores ($10000) a $8000
    component.selectedItemType.set('bundle');
    component.selectedBundleIdToAdd.set(10);
    component.offerPriceToAdd.set(8000);
    component.addItemToOffer();

    expect(component.offerItems().length).toBe(2);
    expect(component.totalRegularPrice()).toBe(13000);
    expect(component.totalOfferPrice()).toBe(10400);
    expect(component.totalSavings()).toBe(2600);
    expect(component.averageDiscount()).toBe(20);
  });

  it('should mass-apply campaign discount to all items in Step 3', () => {
    component.offerForm.controls.discount_percentage.setValue(30);

    // Agregar producto con precio normal
    component.selectedItemType.set('product');
    component.selectedProductIdToAdd.set(1);
    component.offerPriceToAdd.set(3000);
    component.addItemToOffer();

    expect(component.offerItems()[0].offer_price).toBe(3000);

    // Aplicar descuento masivo del 30% ($3000 - 30% = $2100)
    component.applyCampaignDiscountToAll();

    expect(component.offerItems()[0].offer_price).toBe(2100);
    expect(component.offerItems()[0].calculated_discount).toBe(30);
  });

  it('should save new offer and emit offerSaved', async () => {
    // Paso 1
    component.offerForm.controls.name.setValue('CyberWeek');
    component.bannerUrl.set('https://example.com/banner.jpg');
    component.offerForm.controls.discount_percentage.setValue(20);

    // Paso 3
    component.selectedItemType.set('product');
    component.selectedProductIdToAdd.set(1);
    component.offerPriceToAdd.set(2400);
    component.addItemToOffer();

    component.currentStep.set(4);

    let emitted: OfferWithItems | undefined;
    component.offerSaved.subscribe((o) => (emitted = o));

    await component.saveOffer();

    expect(offersServiceMock.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CyberWeek',
        slug: 'cyberweek',
        image_url: 'https://example.com/banner.jpg',
        discount_percentage: 20,
      }),
      expect.arrayContaining([
        expect.objectContaining({
          product_id: 1,
          price: 2400,
        }),
      ])
    );
    expect(emitted?.id).toBe(77);
    expect(component.visible()).toBe(false);
  });
});

