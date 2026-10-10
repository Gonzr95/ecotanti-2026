import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { staffGuard, AuthService, SupabaseService } from '@ecotanti/shared-auth';

describe('staffGuard', () => {
  let authServiceMock: {
    getCurrentUser: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let supabaseMock: {
    from: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authServiceMock = {
      getCurrentUser: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    supabaseMock = {
      from: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should redirect to root if user is not authenticated', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue(null);

    const result = await TestBed.runInInjectionContext(() =>
      staffGuard({} as any, {} as any)
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('should logout and redirect to root if user has no staff roles', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue({ id: 'usr-customer' });
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await TestBed.runInInjectionContext(() =>
      staffGuard({} as any, {} as any)
    );

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('should grant access when user has valid staff roles', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue({ id: 'usr-admin' });
    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ role_id: 'role-administrador' }],
          error: null,
        }),
      }),
    });

    const result = await TestBed.runInInjectionContext(() =>
      staffGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });
});

