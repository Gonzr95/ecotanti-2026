import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import { BrandsService, CategoriesService, ProductsService } from '@ecotanti/shared-catalog';
import { ProductsComponent } from './products';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;

  beforeEach(async () => {
    const brandsServiceMock = {
      getBrandsWithProductCount: vi.fn().mockResolvedValue([]),
    };
    const categoriesServiceMock = {
      getCategories: vi.fn().mockResolvedValue([]),
    };
    const productsServiceMock = {
      createProduct: vi.fn().mockResolvedValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideOptimus({ theme: { preset: Aura } }),
        MessageService,
        { provide: BrandsService, useValue: brandsServiceMock },
        { provide: CategoriesService, useValue: categoriesServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the products component', () => {
    expect(component).toBeTruthy();
    expect(component.isWizardVisible()).toBe(false);
  });

  it('should open the wizard when openNewProductWizard is called', () => {
    component.openNewProductWizard();
    expect(component.isWizardVisible()).toBe(true);
  });
});

