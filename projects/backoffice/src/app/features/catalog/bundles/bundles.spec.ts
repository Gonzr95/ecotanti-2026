import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import { BundlesService, ProductsService } from '@ecotanti/shared-catalog';
import { BundlesComponent } from './bundles';

describe('BundlesComponent', () => {
  let component: BundlesComponent;
  let fixture: ComponentFixture<BundlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BundlesComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
        MessageService,
        {
          provide: ProductsService,
          useValue: {
            getProducts: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: BundlesService,
          useValue: {
            getBundles: vi.fn().mockResolvedValue([]),
            createBundle: vi.fn().mockResolvedValue({}),
            uploadBundleImage: vi.fn().mockResolvedValue(''),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BundlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the bundles component', () => {
    expect(component).toBeTruthy();
    expect(component.isWizardVisible()).toBe(false);
  });

  it('should open wizard on openNewBundleWizard()', () => {
    component.openNewBundleWizard();
    expect(component.isWizardVisible()).toBe(true);
  });
});

