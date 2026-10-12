import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { OrdersTableComponent } from './orders-table';
import { OrderWithDetails } from '@ecotanti/shared-catalog';

describe('OrdersTableComponent', () => {
  let component: OrdersTableComponent;
  let fixture: ComponentFixture<OrdersTableComponent>;

  const mockOrders: OrderWithDetails[] = [
    {
      id: 1,
      order_number: 'ORD-2026-0001',
      user_id: 'user-1',
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'mercadopago',
      subtotal_amount: 15000,
      discount_id: null,
      discount_amount: 0,
      credit_used: 0,
      shipping_cost: 1200,
      total_amount: 16200,
      final_paid_amount: 16200,
      notes: 'Dejar en portería',
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
        recipient_phone: '+5493541123456',
        recipient_email: 'juan@example.com',
        recipient_dni: '35123456',
        address_line: 'Av. San Martín 123',
        city: 'Tanti',
        province: 'Córdoba',
        postal_code: '5155',
        notes: null,
        tracking_number: null,
        created_at: '2026-10-12T14:30:00Z',
      },
    },
    {
      id: 2,
      order_number: 'ORD-2026-0002',
      user_id: 'user-2',
      status: 'preparing',
      payment_status: 'completed',
      payment_method: 'transfer',
      subtotal_amount: 8000,
      discount_id: null,
      discount_amount: 0,
      credit_used: 0,
      shipping_cost: 0,
      total_amount: 8000,
      final_paid_amount: 8000,
      notes: null,
      created_at: '2026-10-12T15:00:00Z',
      updated_at: '2026-10-12T15:00:00Z',
      items: [],
      delivery: {
        id: 202,
        order_id: 2,
        shipping_method: 'pickup',
        shipping_cost: 0,
        recipient_name: 'Maria Gomez',
        recipient_phone: '+5493541654321',
        recipient_email: 'maria@example.com',
        recipient_dni: '38987654',
        address_line: 'Belgrano 45',
        city: 'Villa Carlos Paz',
        province: 'Córdoba',
        postal_code: '5152',
        notes: null,
        tracking_number: null,
        created_at: '2026-10-12T15:00:00Z',
      },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersTableComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('orders', mockOrders);
    fixture.detectChanges();
  });

  it('should create OrdersTableComponent', () => {
    expect(component).toBeTruthy();
    expect(component.filteredOrders().length).toBe(2);
  });

  it('should filter orders using multi-criteria searchQuery', () => {
    component.searchQuery.set('Maria');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].order_number).toBe('ORD-2026-0002');

    component.searchQuery.set('ORD-2026-0001');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].id).toBe(1);

    component.searchQuery.set('Carlos Paz');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].id).toBe(2);

    component.searchQuery.set('non-existent');
    expect(component.filteredOrders().length).toBe(0);
  });

  it('should filter orders by status, payment_status and shipping_method', () => {
    component.selectedStatusFilter.set('pending');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].id).toBe(1);

    component.selectedStatusFilter.set('all');
    component.selectedPaymentFilter.set('completed');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].id).toBe(2);

    component.selectedPaymentFilter.set('all');
    component.selectedShippingFilter.set('pickup');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].id).toBe(2);
  });

  it('should clear all filters', () => {
    component.searchQuery.set('Juan');
    component.selectedStatusFilter.set('pending');
    component.clearAllFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedStatusFilter()).toBe('all');
    expect(component.selectedPaymentFilter()).toBe('all');
    expect(component.selectedShippingFilter()).toBe('all');
    expect(component.filteredOrders().length).toBe(2);
  });

  it('should emit statusChange immediately for non-cancelled status', () => {
    const statusSpy = vi.spyOn(component.statusChange, 'emit');
    component.onStatusDropdownChange(mockOrders[0], 'preparing');

    expect(statusSpy).toHaveBeenCalledWith({
      order: mockOrders[0],
      newStatus: 'preparing',
    });
    expect(component.isCancelDialogOpen()).toBe(false);
  });

  it('should open confirmation dialog when attempting to cancel an order', () => {
    const statusSpy = vi.spyOn(component.statusChange, 'emit');
    component.onStatusDropdownChange(mockOrders[0], 'cancelled');

    expect(statusSpy).not.toHaveBeenCalled();
    expect(component.isCancelDialogOpen()).toBe(true);
    expect(component.orderPendingCancellation()).toEqual(mockOrders[0]);

    // Confirm cancel
    component.confirmCancelOrder();
    expect(statusSpy).toHaveBeenCalledWith({
      order: mockOrders[0],
      newStatus: 'cancelled',
    });
    expect(component.isCancelDialogOpen()).toBe(false);
    expect(component.orderPendingCancellation()).toBeNull();
  });

  it('should emit paymentStatusChange', () => {
    const paymentSpy = vi.spyOn(component.paymentStatusChange, 'emit');
    component.onPaymentStatusChange(mockOrders[0], 'completed');

    expect(paymentSpy).toHaveBeenCalledWith({
      order: mockOrders[0],
      newStatus: 'completed',
    });
  });

  it('should provide helper metadata correctly', () => {
    const statusMeta = component.getStatusMeta('delivered');
    expect(statusMeta.label).toBe('Entregado');

    const paymentMeta = component.getPaymentStatusMeta('completed');
    expect(paymentMeta.label).toBe('Pagado');

    const shippingLabel = component.getShippingLabel('pickup');
    expect(shippingLabel).toBe('Retiro en Local');
  });
});
