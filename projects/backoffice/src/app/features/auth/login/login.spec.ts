import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import { AuthService } from '@ecotanti/shared-auth';
import { LoginComponent, REDIRECT_DELAY_MS } from './login';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: {
    loginStaff: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authServiceMock = {
      loginStaff: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'home', component: LoginComponent }]),
        provideOptimus({ theme: { preset: Aura } }),
        { provide: AuthService, useValue: authServiceMock },
        { provide: REDIRECT_DELAY_MS, useValue: 0 },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an invalid empty form', () => {
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.controls.email.valid).toBe(false);
    expect(component.loginForm.controls.password.valid).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should validate email format and password min length', () => {
    const emailControl = component.emailControl;
    const passwordControl = component.passwordControl;

    // Email inválido
    emailControl.setValue('correo-invalido');
    expect(emailControl.valid).toBe(false);
    expect(emailControl.errors?.['email']).toBeTruthy();

    // Password menor a 6 caracteres
    passwordControl.setValue('12345');
    expect(passwordControl.valid).toBe(false);
    expect(passwordControl.errors?.['minlength']).toBeTruthy();

    // Válidos
    emailControl.setValue('admin@ecotanti.com');
    passwordControl.setValue('secreto123');
    expect(emailControl.valid).toBe(true);
    expect(passwordControl.valid).toBe(true);
    expect(component.loginForm.valid).toBe(true);
  });

  it('should not call authService if form is invalid on submit', async () => {
    await component.onSubmit();

    expect(authServiceMock.loginStaff).not.toHaveBeenCalled();
    expect(component.emailControl.touched).toBe(true);
    expect(component.passwordControl.touched).toBe(true);
  });

  it('should handle successful login flow', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    authServiceMock.loginStaff.mockResolvedValueOnce({
      success: true,
      user: { id: 'usr-1', email: 'admin@ecotanti.com' },
      roles: ['admin'],
    });

    component.loginForm.setValue({
      email: 'admin@ecotanti.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(authServiceMock.loginStaff).toHaveBeenCalledWith('admin@ecotanti.com', 'password123');
    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    expect(component.loading()).toBe(false);
    expect(component.isRedirecting()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should render loading overlay with blur and spinner when isRedirecting is true', async () => {
    component.isRedirecting.set(true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.backdrop-blur-md');
    expect(overlay).toBeTruthy();
    expect(overlay.textContent).toContain('Acceso Verificado');
    expect(overlay.textContent).toContain('Cargando panel de administración...');
  });

  it('should handle failed login and show obfuscated error', async () => {
    authServiceMock.loginStaff.mockResolvedValueOnce({
      success: false,
      error: 'Credenciales incorrectas',
    });

    component.loginForm.setValue({
      email: 'unauthorized@ecotanti.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(authServiceMock.loginStaff).toHaveBeenCalledWith('unauthorized@ecotanti.com', 'password123');
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('Credenciales incorrectas');
  });
});
