import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { BrandWithProductCount, BrandsService } from '@ecotanti/shared-catalog';
import { BrandsComponent } from './brands';

describe('BrandsComponent', () => {
  let component: BrandsComponent;
  let fixture: ComponentFixture<BrandsComponent>;
  let brandsServiceMock: {
    getBrandsWithProductCount: ReturnType<typeof vi.fn>;
    createBrand: ReturnType<typeof vi.fn>;
    updateBrand: ReturnType<typeof vi.fn>;
    toggleActive: ReturnType<typeof vi.fn>;
    deleteBrand: ReturnType<typeof vi.fn>;
  };
  let confirmationService: ConfirmationService;
  let messageService: MessageService;

  const mockBrands: BrandWithProductCount[] = [
    {
      id: 1,
      name: 'Arcor',
      slug: 'arcor',
      logo_url: 'https://example.com/arcor.png',
      is_active: true,
      product_count: 5,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    },
    {
      id: 2,
      name: 'Molinos',
      slug: 'molinos',
      logo_url: null,
      is_active: false,
      product_count: 0,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: null,
    },
  ];

  beforeEach(async () => {
    brandsServiceMock = {
      getBrandsWithProductCount: vi.fn().mockResolvedValue(mockBrands),
      createBrand: vi.fn().mockResolvedValue({
        id: 3,
        name: 'La Serenísima',
        slug: 'la-serenisima',
        logo_url: null,
        is_active: true,
        created_at: '2026-01-03T00:00:00Z',
        updated_at: null,
      }),
      updateBrand: vi.fn().mockResolvedValue({
        id: 1,
        name: 'Arcor Modificada',
        slug: 'arcor-modificada',
        logo_url: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-04T00:00:00Z',
      }),
      toggleActive: vi.fn().mockResolvedValue(undefined),
      deleteBrand: vi.fn().mockResolvedValue(undefined),
    };

    confirmationService = new ConfirmationService();
    messageService = new MessageService();

    vi.spyOn(confirmationService, 'confirm');
    vi.spyOn(messageService, 'add');

    await TestBed.configureTestingModule({
      imports: [BrandsComponent],
      providers: [
        provideOptimus({ theme: { preset: Aura } }),
        { provide: BrandsService, useValue: brandsServiceMock },
      ],
    })
      .overrideComponent(BrandsComponent, {
        set: {
          providers: [
            { provide: BrandsService, useValue: brandsServiceMock },
            { provide: ConfirmationService, useValue: confirmationService },
            { provide: MessageService, useValue: messageService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BrandsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the brands component and load initial brands', () => {
    expect(component).toBeTruthy();
    expect(brandsServiceMock.getBrandsWithProductCount).toHaveBeenCalled();
    expect(component.brands().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('should filter brands by search term', () => {
    component.searchTerm.set('arcor');
    expect(component.filteredBrands().length).toBe(1);
    expect(component.filteredBrands()[0].name).toBe('Arcor');

    component.searchTerm.set('inexistente');
    expect(component.filteredBrands().length).toBe(0);

    component.searchTerm.set('');
    expect(component.filteredBrands().length).toBe(2);
  });

  it('should open new brand dialog with clean state', () => {
    component.openNewBrandDialog();
    expect(component.isEditMode()).toBe(false);
    expect(component.editingBrandId()).toBeNull();
    expect(component.isDialogVisible()).toBe(true);
    expect(component.brandForm.get('name')?.value).toBe('');
    expect(component.brandForm.get('is_active')?.value).toBe(true);
  });

  it('should open edit brand dialog with brand values prefilled', () => {
    component.openEditBrandDialog(mockBrands[0]);
    expect(component.isEditMode()).toBe(true);
    expect(component.editingBrandId()).toBe(1);
    expect(component.isDialogVisible()).toBe(true);
    expect(component.brandForm.get('name')?.value).toBe('Arcor');
    expect(component.brandForm.get('logo_url')?.value).toBe('https://example.com/arcor.png');
    expect(component.brandForm.get('is_active')?.value).toBe(true);
  });

  it('should create a brand on submit in create mode', async () => {
    component.openNewBrandDialog();
    component.brandForm.patchValue({
      name: 'La Serenísima',
      logo_url: '',
      is_active: true,
    });

    await component.saveBrand();

    expect(brandsServiceMock.createBrand).toHaveBeenCalledWith({
      name: 'La Serenísima',
      slug: '',
      logo_url: null,
      is_active: true,
    });
    expect(component.isDialogVisible()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it('should update a brand on submit in edit mode', async () => {
    component.openEditBrandDialog(mockBrands[0]);
    component.brandForm.patchValue({
      name: 'Arcor Modificada',
      logo_url: '',
      is_active: true,
    });

    await component.saveBrand();

    expect(brandsServiceMock.updateBrand).toHaveBeenCalledWith(1, {
      name: 'Arcor Modificada',
      logo_url: null,
      is_active: true,
    });
    expect(component.isDialogVisible()).toBe(false);
  });

  it('should toggle brand active state and update local state', async () => {
    await component.onToggleActive(mockBrands[0], { checked: false });

    expect(brandsServiceMock.toggleActive).toHaveBeenCalledWith(1, false);
    const updated = component.brands().find((b) => b.id === 1);
    expect(updated?.is_active).toBe(false);
  });

  it('should prompt with warning message when deleting a brand with products', () => {
    component.confirmDelete(mockBrands[0]); // Has 5 products

    expect(confirmationService.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('tiene 5 producto(s) asociado(s)'),
      })
    );
  });

  it('should prompt with standard message when deleting a brand without products', () => {
    component.confirmDelete(mockBrands[1]); // Has 0 products

    expect(confirmationService.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('¿Estás seguro de que deseas eliminar permanentemente'),
      })
    );
  });
});

