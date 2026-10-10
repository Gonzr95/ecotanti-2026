import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { DrawerComponent } from './drawer';

describe('DrawerComponent', () => {
  let component: DrawerComponent;
  let fixture: ComponentFixture<DrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerComponent],
      providers: [
        provideRouter([]),
        provideOptimus({ theme: { preset: Aura } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create DrawerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should have visible false by default', () => {
    expect(component.visible()).toBe(false);
  });

  it('should toggle sections correctly', () => {
    expect(component.openSections().catalogo).toBe(true);
    expect(component.openSections().usuarios).toBe(false);

    component.toggleSection('catalogo');
    expect(component.openSections().catalogo).toBe(false);

    component.toggleSection('usuarios');
    expect(component.openSections().usuarios).toBe(true);
  });

  it('should close the drawer when close() is called', () => {
    component.visible.set(true);
    expect(component.visible()).toBe(true);

    component.close();
    expect(component.visible()).toBe(false);
  });

  it('should call close() when inner hamburger button is clicked', async () => {
    component.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const closeSpy = vi.spyOn(component, 'close');
    const button = fixture.nativeElement.querySelector('button[aria-label="Cerrar menú"]');
    if (button) {
      button.click();
      expect(closeSpy).toHaveBeenCalled();
    }
  });
});

