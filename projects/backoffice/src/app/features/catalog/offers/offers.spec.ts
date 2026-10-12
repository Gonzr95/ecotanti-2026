import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import {
  BundlesService,
  OfferWithItems,
  OffersService,
  ProductsService,
} from '@ecotanti/shared-catalog';
import { OffersComponent } from './offers';

describe('OffersComponent', () => {
  let component: OffersComponent;
  let fixture: ComponentFixture<OffersComponent>;
  let offersServiceMock: {
    getOffers: ReturnType<typeof vi.fn>;
    toggleOfferStatus: ReturnType<typeof vi.fn>;
    deleteOffer: ReturnType<typeof vi.fn>;
    uploadOfferImage: ReturnType<typeof vi.fn>;
  };
  let productsServiceMock: {
    getProducts: ReturnType<typeof vi.fn>;
  };
  let bundlesServiceMock: {
    getBundles: ReturnType<typeof vi.fn>;
  };

  const mockOffers: OfferWithItems[] = [
    {
      id: 1,
      name: 'CyberWeek EcoTanti',
      slug: 'cyberweek-ecotanti',
      description: 'Gran semana de descuentos en chocolates',
      image_url: 'https://example.com/banner.jpg',
      logo_url: 'https://example.com/logo.png',
      promotion_starts_at: null,
      valid_from: '2026-10-01T00:00:00Z',
      valid_until: '2026-10-31T23:59:59Z',
      discount_percentage: 20,
      is_active: true,
      created_at: '',
      updated_at: null,
      items: [],
    },
    {
      id: 2,
      name: 'Oferta Pausada',
      slug: 'oferta-pausada',
      description: null,
      image_url: null,
      logo_url: null,
      promotion_starts_at: null,
      valid_from: null,
      valid_until: null,
      discount_percentage: null,
      is_active: false,
      created_at: '',
      updated_at: null,
      items: [],
    },
  ];

  beforeEach(async () => {
    offersServiceMock = {
      getOffers: vi.fn().mockResolvedValue(mockOffers),
      toggleOfferStatus: vi.fn().mockResolvedValue(undefined),
      deleteOffer: vi.fn().mockResolvedValue({ success: true }),
      uploadOfferImage: vi.fn().mockResolvedValue('https://example.com/img.jpg'),
    };
    productsServiceMock = {
      getProducts: vi.fn().mockResolvedValue([]),
    };
    bundlesServiceMock = {
      getBundles: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
        MessageService,
        { provide: OffersService, useValue: offersServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: BundlesService, useValue: bundlesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load offers collection', () => {
    expect(component).toBeTruthy();
    expect(offersServiceMock.getOffers).toHaveBeenCalled();
    expect(component.offers().length).toBe(2);
    expect(component.filteredOffers().length).toBe(2);
  });

  it('should filter offers by text query', () => {
    component.searchQuery.set('cyber');
    expect(component.filteredOffers().length).toBe(1);
    expect(component.filteredOffers()[0].name).toBe('CyberWeek EcoTanti');

    component.searchQuery.set('inexistente');
    expect(component.filteredOffers().length).toBe(0);
  });

  it('should filter offers by status (active vs paused)', () => {
    component.statusFilter.set('active');
    expect(component.filteredOffers().length).toBe(1);
    expect(component.filteredOffers()[0].id).toBe(1);

    component.statusFilter.set('paused');
    expect(component.filteredOffers().length).toBe(1);
    expect(component.filteredOffers()[0].id).toBe(2);
  });

  it('should toggle offer status reactively', async () => {
    const target = component.offers()[0];
    await component.toggleOfferStatus(target);

    expect(offersServiceMock.toggleOfferStatus).toHaveBeenCalledWith(1, false);
    expect(component.offers()[0].is_active).toBe(false);
  });

  it('should open wizard in create and edit modes', () => {
    // Modo creación
    component.openCreateWizard();
    expect(component.isWizardVisible()).toBe(true);
    expect(component.selectedOfferToEdit()).toBeNull();

    // Modo edición
    const target = component.offers()[0];
    component.openEditWizard(target);
    expect(component.isWizardVisible()).toBe(true);
    expect(component.selectedOfferToEdit()).toEqual(target);
  });

  it('should delete offer successfully when there are no historical orders', async () => {
    const target = component.offers()[0];
    component.askDeleteOffer(target);

    expect(component.isDeleteDialogOpen()).toBe(true);
    expect(component.offerToDelete()).toEqual(target);

    await component.executeDelete();

    expect(offersServiceMock.deleteOffer).toHaveBeenCalledWith(1);
    expect(component.offers().length).toBe(1);
    expect(component.isDeleteDialogOpen()).toBe(false);
  });

  it('should display warning if offer has historical orders and prevent deletion', async () => {
    offersServiceMock.deleteOffer.mockResolvedValueOnce({
      success: false,
      hasOrders: true,
    });

    const target = component.offers()[0];
    component.askDeleteOffer(target);
    await component.executeDelete();

    expect(component.hasOrdersWarning()).toBe(true);
    expect(component.offers().length).toBe(2); // no se borra
  });
});

