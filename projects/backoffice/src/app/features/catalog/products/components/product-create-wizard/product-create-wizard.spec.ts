import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Brand,
  BrandsService,
  CategoriesService,
  Category,
  Product,
  ProductsService,
} from '@ecotanti/shared-catalog';
import { ProductCreateWizardComponent } from './product-create-wizard';

describe('ProductCreateWizardComponent', () => {
  let component: ProductCreateWizardComponent;
  let fixture: ComponentFixture<ProductCreateWizardComponent>;
  let brandsServiceMock: {
    getBrandsWithProductCount: ReturnType<typeof vi.fn>;
  };
  let categoriesServiceMock: {
    getCategories: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
  };
  let productsServiceMock: {
    createProduct: ReturnType<typeof vi.fn>;
    uploadProductImage: ReturnType<typeof vi.fn>;
  };

  const mockBrands: any[] = [
    { id: 1, name: 'EcoTanti', is_active: true, slug: 'ecotanti' },
    { id: 2, name: 'Marca Inactiva', is_active: false, slug: 'inactiva' },
  ];

  const mockCategories: Category[] = [
    { id: 10, name: 'Infusiones', slug: 'infusiones', description: null, is_active: true, created_at: '', updated_at: null },
    { id: 20, name: 'Snacks', slug: 'snacks', description: null, is_active: false, created_at: '', updated_at: null },
  ];

  beforeEach(async () => {
    brandsServiceMock = {
      getBrandsWithProductCount: vi.fn().mockResolvedValue(mockBrands),
    };
    categoriesServiceMock = {
      getCategories: vi.fn().mockResolvedValue(mockCategories),
      createCategory: vi.fn().mockResolvedValue({
        id: 30,
        name: 'Cosmética Natural',
        slug: 'cosmetica-natural',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: null,
      }),
    };
    productsServiceMock = {
      createProduct: vi.fn().mockResolvedValue({
        id: 100,
        name: 'Té Verde Orgánico',
        slug: 'te-verde-organico',
        base_price: 1500,
        cost_price: 900,
        sale_price: null,
        stock: 25,
        category_id: 10,
        brand_id: 1,
        images: ['https://example.com/te.jpg'],
        is_active: true,
        is_highlight: false,
        is_on_sale: false,
        created_at: '',
        updated_at: null,
      }),
      uploadProductImage: vi.fn().mockResolvedValue('https://example.com/uploaded.jpg'),
    };

    await TestBed.configureTestingModule({
      imports: [ProductCreateWizardComponent],
      providers: [
        provideOptimus({ theme: { preset: Aura } }),
        MessageService,
        { provide: BrandsService, useValue: brandsServiceMock },
        { provide: CategoriesService, useValue: categoriesServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCreateWizardComponent);
    component = fixture.componentInstance;
    component.visible.set(true);
    await fixture.whenStable();
  });

  it('should initialize at Step 1 with 20% progress and filter active brands and categories', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep()).toBe(1);
    expect(component.progressPercentage()).toBe(20);
    // Solo marcas activas
    expect(component.brands().length).toBe(1);
    expect(component.brands()[0].id).toBe(1);
    // Solo categorías activas
    expect(component.categories().length).toBe(1);
    expect(component.categories()[0].id).toBe(10);
  });

  it('should prevent advancing from Step 1 if name or brand is missing', () => {
    // Formulario vacío
    component.nextStep();
    expect(component.currentStep()).toBe(1);

    // Solo nombre ingresado
    component.productForm.controls.name.setValue('Yerba Mate');
    component.nextStep();
    expect(component.currentStep()).toBe(1);

    // Nombre y Marca ingresados
    component.productForm.controls.brand_id.setValue(1);
    component.nextStep();
    expect(component.currentStep()).toBe(2);
    expect(component.progressPercentage()).toBe(40);
  });

  it('should validate Step 2 prices and calculate gross profit and margin percent in real time', () => {
    component.currentStep.set(2);

    // Precio base y costo vacíos
    expect(component.canAdvanceStep(2)).toBe(false);

    component.productForm.controls.base_price.setValue(1000);
    component.productForm.controls.cost_price.setValue(600);

    expect(component.canAdvanceStep(2)).toBe(true);
    // Ganancia = 1000 - 600 = 400
    expect(component.calculatedGrossProfit()).toBe(400);
    // Margen = (400 / 1000) * 100 = 40%
    expect(component.calculatedMarginPercent()).toBe(40);
  });

  it('should support uploading multiple photos simultaneously up to 3 photos limit', async () => {
    component.currentStep.set(4);
    expect(component.images().length).toBe(0);

    const file1 = new File(['dummy1'], 'foto1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['dummy2'], 'foto2.jpg', { type: 'image/jpeg' });
    const file3 = new File(['dummy3'], 'foto3.jpg', { type: 'image/jpeg' });

    productsServiceMock.uploadProductImage
      .mockResolvedValueOnce('https://example.com/foto1.jpg')
      .mockResolvedValueOnce('https://example.com/foto2.jpg')
      .mockResolvedValueOnce('https://example.com/foto3.jpg');

    const fakeEvent = {
      target: {
        files: [file1, file2, file3],
        value: 'dummy',
      },
    } as unknown as Event;

    await component.onFileSelected(fakeEvent);

    expect(productsServiceMock.uploadProductImage).toHaveBeenCalledTimes(3);
    expect(component.images().length).toBe(3);
    expect(component.images()).toEqual([
      'https://example.com/foto1.jpg',
      'https://example.com/foto2.jpg',
      'https://example.com/foto3.jpg',
    ]);
    expect(component.canAdvanceStep(4)).toBe(true);
  });

  it('should validate Step 3 category and support inline category creation', async () => {
    component.currentStep.set(3);
    component.productForm.controls.stock.setValue(15);

    // Falta categoría
    expect(component.canAdvanceStep(3)).toBe(false);

    // Crear categoría inline
    component.inlineCategoryName.set('Cosmética Natural');
    await component.saveInlineCategory();

    expect(categoriesServiceMock.createCategory).toHaveBeenCalledWith({
      name: 'Cosmética Natural',
      slug: '',
      is_active: true,
    });
    expect(component.productForm.controls.category_id.value).toBe(30);
    expect(component.canAdvanceStep(3)).toBe(true);
  });

  it('should manage image list, enforce 1-3 photos limit, and manage cover in Step 4', () => {
    component.currentStep.set(4);

    // Paso 4 requiere al menos 1 imagen
    expect(component.canAdvanceStep(4)).toBe(false);

    // Agregar 1ra imagen (suficiente para avanzar)
    component.imageUrlInput.set('https://example.com/img1.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(1);
    expect(component.canAdvanceStep(4)).toBe(true);

    // Agregar 2da y 3ra imagen
    component.imageUrlInput.set('https://example.com/img2.jpg');
    component.addImageUrl();
    component.imageUrlInput.set('https://example.com/img3.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(3);
    expect(component.canAdvanceStep(4)).toBe(true);

    // Intentar agregar una 4ta imagen (debe ignorarse por límite de 3)
    component.imageUrlInput.set('https://example.com/img4.jpg');
    component.addImageUrl();
    expect(component.images().length).toBe(3);

    // Cambiar portada
    component.setCoverImage(1);
    expect(component.images()[0]).toBe('https://example.com/img2.jpg');

    // Eliminar imágenes
    component.removeImage(0);
    expect(component.images().length).toBe(2);
    expect(component.canAdvanceStep(4)).toBe(true);

    component.removeImage(0);
    component.removeImage(0);
    expect(component.images().length).toBe(0);
    expect(component.canAdvanceStep(4)).toBe(false);
  });

  it('should allow going backwards to previous steps at any time', () => {
    component.currentStep.set(4);
    component.prevStep();
    expect(component.currentStep()).toBe(3);
    component.prevStep();
    expect(component.currentStep()).toBe(2);
  });

  it('should save the complete product in Step 5 and display success modal', async () => {
    component.productForm.controls.name.setValue('Té Verde Orgánico');
    component.productForm.controls.brand_id.setValue(1);
    component.productForm.controls.base_price.setValue(1500);
    component.productForm.controls.cost_price.setValue(900);
    component.productForm.controls.stock.setValue(25);
    component.productForm.controls.category_id.setValue(10);
    component.images.set(['https://example.com/te.jpg']);
    component.currentStep.set(5);

    let emittedProduct: Product | undefined;
    component.productCreated.subscribe((p) => (emittedProduct = p));

    await component.saveProduct();

    expect(productsServiceMock.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Té Verde Orgánico',
        brand_id: 1,
        category_id: 10,
        base_price: 1500,
        cost_price: 900,
        stock: 25,
        images: ['https://example.com/te.jpg'],
        is_active: true,
      })
    );

    expect(emittedProduct).toBeDefined();
    expect(component.isSuccessModalVisible()).toBe(true);
    expect(component.createdProductName()).toBe('Té Verde Orgánico');
  });

  it('should reset wizard back to Step 1 when choosing to register another product', () => {
    component.currentStep.set(5);
    component.isSuccessModalVisible.set(true);
    component.productForm.controls.name.setValue('Producto Test');

    component.onRegisterAnother();

    expect(component.isSuccessModalVisible()).toBe(false);
    expect(component.currentStep()).toBe(1);
    expect(component.productForm.controls.name.value).toBe('');
    expect(component.images().length).toBe(0);
  });
});

