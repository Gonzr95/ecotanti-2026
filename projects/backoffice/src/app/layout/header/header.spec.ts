import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { AuthService } from '@ecotanti/shared-auth';
import { HeaderComponent } from './header';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authServiceMock: {
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        provideOptimus({ theme: { preset: Aura } }),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create HeaderComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should emit toggleMenu event when hamburger is triggered', () => {
    const emitSpy = vi.spyOn(component.toggleMenu, 'emit');
    const button = fixture.nativeElement.querySelector('button[aria-label="Abrir menú"]');

    expect(button).toBeTruthy();
    button.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should call authService.logout and navigate to root on logout', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.onLogout();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});

