import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { OrderDetailDrawerComponent } from './order-detail-drawer';
import { OrderWithDetails } from '@ecotanti/shared-catalog';

describe('OrderDetailDrawerComponent', () => {
  let component: OrderDetailDrawerComponent;
  let fixture: ComponentFixture<OrderDetailDrawerComponent>;

  const mockOrder: OrderWithDetails = {
    id: 1,
    order_number: 'ORD-2026-0001',
    user_id: 'user-1',
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'mercadopago',
    subtotal_amount: 15000,
    discount_id: null,
    discount_amount: 1500,
    credit_used: 500,
    shipping_cost: 1200,
    total_amount: 14200,
    final_paid_amount: 14200,
    notes: 'Por favor dejar en portería',
    created_at: '2026-10-12T14:30:00Z',
    updated_at: '2026-10-12T14:30:00Z',
    items: [
      {
        id: 101,
        order_id: 1,
        product_id: 10,
        bundle_id: null,
        offer_item_id: null,
        item_type: 'product',
        item_name: 'Shampoo Sólido Lavanda',
        regular_price: 5000,
        unit_price: 5000,
        cost_price: 2500,
        quantity: 3,
        subtotal: 15000,
      },
    ],
    delivery: {
      id: 201,
      order_id: 1,
      shipping_method: 'local_delivery',
      shipping_cost: 1200,
      recipient_name: 'Juan Perez',
      recipient_phone: '+54 9 3541 12-3456',
      recipient_email: 'juan@example.com',
      recipient_dni: '35123456',
      address_line: 'Av. San Martín 123',
      city: 'Tanti',
      province: 'Córdoba',
      postal_code: '5155',
      notes: 'Tocar timbre 2B',
      tracking_number: 'AR-998877',
      created_at: '2026-10-12T14:30:00Z',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailDrawerComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', mockOrder);
    component.visible.set(true);
    fixture.detectChanges();
  });

  it('should create OrderDetailDrawerComponent', () => {
    expect(component).toBeTruthy();
    expect(component.visible()).toBe(true);
  });

  it('should initialize trackingInput from order delivery tracking number', () => {
    expect(component.trackingInput()).toBe('AR-998877');
  });

  it('should format WhatsApp URL with cleaned phone and pre-filled message', () => {
    const url = component.getWhatsAppUrl();
    expect(url).toContain('wa.me/5493541123456');
    expect(url).toContain(encodeURIComponent('Juan Perez'));
    expect(url).toContain(encodeURIComponent('ORD-2026-0001'));
  });

  it('should emit trackingUpdate when saving tracking', () => {
    const trackingSpy = vi.spyOn(component.trackingUpdate, 'emit');
    component.trackingInput.set('TRACK-NEW-123');
    component.saveTracking();

    expect(trackingSpy).toHaveBeenCalledWith({
      order: mockOrder,
      trackingNumber: 'TRACK-NEW-123',
    });
  });

  it('should emit statusChange for non-cancelled status', () => {
    const statusSpy = vi.spyOn(component.statusChange, 'emit');
    component.onStatusChange('shipped');

    expect(statusSpy).toHaveBeenCalledWith({
      order: mockOrder,
      newStatus: 'shipped',
    });
    expect(component.isCancelDialogOpen()).toBe(false);
  });

  it('should open cancellation dialog when choosing cancelled and emit on confirmation', () => {
    const statusSpy = vi.spyOn(component.statusChange, 'emit');
    component.onStatusChange('cancelled');

    expect(statusSpy).not.toHaveBeenCalled();
    expect(component.isCancelDialogOpen()).toBe(true);

    component.confirmCancelOrder();
    expect(statusSpy).toHaveBeenCalledWith({
      order: mockOrder,
      newStatus: 'cancelled',
    });
    expect(component.isCancelDialogOpen()).toBe(false);
  });

  it('should emit paymentStatusChange', () => {
    const paymentSpy = vi.spyOn(component.paymentStatusChange, 'emit');
    component.onPaymentStatusChange('completed');

    expect(paymentSpy).toHaveBeenCalledWith({
      order: mockOrder,
      newStatus: 'completed',
    });
  });

  it('should close drawer on close()', () => {
    component.close();
    expect(component.visible()).toBe(false);
  });
});

