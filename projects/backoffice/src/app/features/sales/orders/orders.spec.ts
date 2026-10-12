import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import { OrdersService, OrderWithDetails } from '@ecotanti/shared-catalog';
import { NotificationsService } from '../../../core/services/notifications.service';
import { OrdersComponent } from './orders';

describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;

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
      notes: null,
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

  let ordersServiceMock: any;
  let notificationsServiceMock: any;
  let messageServiceMock: any;
  let realtimeCallback: ((payload: any) => void) | null = null;

  beforeEach(async () => {
    ordersServiceMock = {
      getOrders: vi.fn().mockResolvedValue(mockOrders),
      getOrderById: vi.fn().mockResolvedValue(mockOrders[0]),
      updateOrderStatus: vi.fn().mockResolvedValue({}),
      updatePaymentStatus: vi.fn().mockResolvedValue({}),
      updateTrackingNumber: vi.fn().mockResolvedValue({}),
      subscribeToOrders: vi.fn().mockImplementation((cb) => {
        realtimeCallback = cb;
        return { unsubscribe: vi.fn() };
      }),
    };

    notificationsServiceMock = {
      notifyNewOrder: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideOptimus({
          theme: {
            preset: Aura,
          },
        }),
        MessageService,
        { provide: OrdersService, useValue: ordersServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compileComponents();

    messageServiceMock = TestBed.inject(MessageService);
    vi.spyOn(messageServiceMock, 'add');

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create OrdersComponent and load initial orders', () => {
    expect(component).toBeTruthy();
    expect(ordersServiceMock.getOrders).toHaveBeenCalled();
    expect(component.orders().length).toBe(2);
  });

  it('should compute operational and revenue metrics accurately', () => {
    expect(component.totalOrders()).toBe(2);
    expect(component.pendingOrders()).toBe(1);
    expect(component.preparingOrders()).toBe(1);
    expect(component.pendingPaymentOrders()).toBe(1);
    expect(component.totalRevenue()).toBe(8000); // only completed order total
  });

  it('should open drawer with selected order on onOrderSelected()', () => {
    expect(component.isDrawerOpen()).toBe(false);
    expect(component.selectedOrder()).toBeNull();

    component.onOrderSelected(mockOrders[0]);

    expect(component.isDrawerOpen()).toBe(true);
    expect(component.selectedOrder()).toEqual(mockOrders[0]);
  });

  it('should handle status change and update local state', async () => {
    await component.handleStatusChange({
      order: mockOrders[0],
      newStatus: 'shipped',
    });

    expect(ordersServiceMock.updateOrderStatus).toHaveBeenCalledWith(1, 'shipped');
    const updatedOrder = component.orders().find((o) => o.id === 1);
    expect(updatedOrder?.status).toBe('shipped');
    expect(messageServiceMock.add).toHaveBeenCalled();
  });

  it('should handle payment status change and update local state', async () => {
    await component.handlePaymentStatusChange({
      order: mockOrders[0],
      newStatus: 'completed',
    });

    expect(ordersServiceMock.updatePaymentStatus).toHaveBeenCalledWith(1, 'completed');
    const updatedOrder = component.orders().find((o) => o.id === 1);
    expect(updatedOrder?.payment_status).toBe('completed');
  });

  it('should handle tracking update and update local delivery info', async () => {
    await component.handleTrackingUpdate({
      order: mockOrders[0],
      trackingNumber: 'TRACK-999',
    });

    expect(ordersServiceMock.updateTrackingNumber).toHaveBeenCalledWith(1, 'TRACK-999');
    const updatedOrder = component.orders().find((o) => o.id === 1);
    expect(updatedOrder?.delivery?.tracking_number).toBe('TRACK-999');
  });

  it('should trigger notification and reload orders on realtime INSERT', async () => {
    expect(realtimeCallback).toBeTruthy();

    if (realtimeCallback) {
      await realtimeCallback({
        eventType: 'INSERT',
        new: {
          id: 3,
          order_number: 'ORD-2026-0003',
          total_amount: 25000,
        },
      });

      expect(notificationsServiceMock.notifyNewOrder).toHaveBeenCalledWith({
        id: 3,
        order_number: 'ORD-2026-0003',
        total_amount: 25000,
      });
      expect(ordersServiceMock.getOrders).toHaveBeenCalledTimes(2);
    }
  });
});
