import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import { AuthService } from '@ecotanti/shared-auth';
import { AdminLayoutComponent } from './layout';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let authServiceMock: {
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authServiceMock = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        provideOptimus({ theme: { preset: Aura } }),
        MessageService,
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create AdminLayoutComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should have isDrawerOpen false by default', () => {
    expect(component.isDrawerOpen()).toBe(false);
  });

  it('should toggle isDrawerOpen state on toggleDrawer()', () => {
    expect(component.isDrawerOpen()).toBe(false);

    component.toggleDrawer();
    expect(component.isDrawerOpen()).toBe(true);

    component.toggleDrawer();
    expect(component.isDrawerOpen()).toBe(false);
  });

  it('should render header and drawer components', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('app-drawer')).toBeTruthy();
  });
});

