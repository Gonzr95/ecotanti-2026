import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOptimus } from '@openng/optimus-ui/config';
import Aura from '@openng/optimus-ui-themes/aura';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Bundle,
  BundlesService,
  OrderWithDetails,
  OrdersService,
  Product,
  ProductsService,
} from '@ecotanti/shared-catalog';
import { OrderCreateModalComponent } from './order-create-modal';

describe('OrderCreateModalComponent', () => {
  let component: OrderCreateModalComponent;
  let fixture: ComponentFixture<OrderCreateModalComponent>;

  const mockProducts: Product[] = [
    {
      id: 10,
      name: 'Shampoo Lavanda',
      slug: 'shampoo-lavanda',
      description: null,
      base_price: 5000,
      cost_price: 2500,
      stock: 5,
      category_id: 1,
      brand_id: 1,
      images: ['https://example.com/shampoo.jpg'],
      is_active: true,
      is_highlight: false,
      is_on_sale: false,
      created_at: '',
      updated_at: null,
    },
    {
      id: 20,
      name: 'Jabón Caléndula',
      slug: 'jabon-calendula',
      description: null,
      base_price: 3000,
      cost_price: 1500,
      stock: 0, // Sin stock
      category_id: 1,
      brand_id: 1,
      images: [],
      is_active: true,
      is_highlight: false,
      is_on_sale: false,
      created_at: '',
      updated_at: null,
    },
  ];

  const mockBundles: Bundle[] = [
    {
      id: 100,
      name: 'Combo Spa Relax',
      slug: 'combo-spa-relax',
      description: null,
      total_price: 12000,
      discount_percentage: 15,
      images: [],
      valid_from: null,
      valid_until: null,
      is_active: true,
      created_at: '',
      updated_at: null,
    },
  ];

  const mockCreatedOrder: OrderWithDetails = {
    id: 50,
    order_number: 'ORD-2026-9999',
    user_id: null,
    status: 'delivered',
    payment_status: 'completed',
    payment_method: 'cash',
    subtotal_amount: 10000,
    discount_id: null,
    discount_amount: 0,
    credit_used: 0,
    shipping_cost: 0,
    total_amount: 10000,
    final_paid_amount: 10000,
    notes: null,
    created_at: '2026-10-12T15:00:00Z',
    updated_at: '2026-10-12T15:00:00Z',
    items: [],
  };

  let ordersServiceMock: any;
  let productsServiceMock: any;
  let bundlesServiceMock: any;

  beforeEach(async () => {
    ordersServiceMock = {
      createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
    };
    productsServiceMock = {
      getProducts: vi.fn().mockResolvedValue(mockProducts),
    };
    bundlesServiceMock = {
      getBundles: vi.fn().mockResolvedValue(mockBundles),
    };

    await TestBed.configureTestingModule({
      imports: [OrderCreateModalComponent],
      providers: [
        provideOptimus({ theme: { preset: Aura } }),
        MessageService,
        { provide: OrdersService, useValue: ordersServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: BundlesService, useValue: bundlesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderCreateModalComponent);
    component = fixture.componentInstance;
    component.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create OrderCreateModalComponent and load catalog', () => {
    expect(component).toBeTruthy();
    expect(productsServiceMock.getProducts).toHaveBeenCalled();
    expect(bundlesServiceMock.getBundles).toHaveBeenCalled();
    expect(component.unifiedCatalog().length).toBe(3); // 2 prods + 1 bundle
  });

  it('should filter catalog by search query and category', () => {
    component.searchQuery.set('Lavanda');
    expect(component.filteredCatalog().length).toBe(1);
    expect(component.filteredCatalog()[0].name).toBe('Shampoo Lavanda');

    component.searchQuery.set('');
    component.catalogFilter.set('bundles');
    expect(component.filteredCatalog().length).toBe(1);
    expect(component.filteredCatalog()[0].type).toBe('bundle');
  });

  it('should add item to cart and calculate subtotal and total', () => {
    const item = component.unifiedCatalog()[0]; // Shampoo Lavanda ($5000)
    component.addToCart(item);

    expect(component.cartItems().length).toBe(1);
    expect(component.cartItems()[0].quantity).toBe(1);
    expect(component.subtotal()).toBe(5000);
    expect(component.total()).toBe(5000);

    // Adding same item increments quantity
    component.addToCart(item);
    expect(component.cartItems()[0].quantity).toBe(2);
    expect(component.subtotal()).toBe(10000);
  });

  it('should not add item if stock is 0', () => {
    const outOfStockItem = component.unifiedCatalog().find((i) => i.stock === 0)!;
    component.addToCart(outOfStockItem);
    expect(component.cartItems().length).toBe(0);
  });

  it('should update quantity and clamp to available stock', () => {
    const item = component.unifiedCatalog()[0]; // Stock: 5
    component.addToCart(item);

    component.updateQuantity(item.id, 4);
    expect(component.cartItems()[0].quantity).toBe(4);
    expect(component.subtotal()).toBe(20000);

    // Try setting to 10 (exceeds stock 5) -> clamps to 5
    component.updateQuantity(item.id, 10);
    expect(component.cartItems()[0].quantity).toBe(5);
  });

  it('should remove item and clear cart', () => {
    const item = component.unifiedCatalog()[0];
    component.addToCart(item);
    expect(component.cartItems().length).toBe(1);

    component.removeFromCart(item.id);
    expect(component.cartItems().length).toBe(0);

    component.addToCart(item);
    component.clearCart();
    expect(component.cartItems().length).toBe(0);
  });

  it('should validate form and calculate shipping when local_delivery is chosen', () => {
    const item = component.unifiedCatalog()[0];
    component.addToCart(item);

    // Without recipient name, invalid
    expect(component.isFormValid()).toBe(false);

    component.recipientName.set('María López');
    expect(component.isFormValid()).toBe(true);

    // Switch to delivery without address -> invalid
    component.shippingMethod.set('local_delivery');
    expect(component.isFormValid()).toBe(false);

    component.shippingAddress.set('San Martín 456');
    component.shippingCost.set(1500);
    expect(component.isFormValid()).toBe(true);
    expect(component.totalShipping()).toBe(1500);
    expect(component.total()).toBe(6500); // 5000 + 1500
  });

  it('should submit order, call OrdersService.createOrder and emit orderCreated', async () => {
    const item = component.unifiedCatalog()[0];
    component.addToCart(item);
    component.recipientName.set('Juan Carlos');
    component.recipientPhone.set('3541-112233');

    const emitSpy = vi.spyOn(component.orderCreated, 'emit');

    await component.submitOrder();

    expect(ordersServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal_amount: 5000,
        total_amount: 5000,
        payment_method: 'cash',
        payment_status: 'completed',
        status: 'delivered',
        delivery: expect.objectContaining({
          recipient_name: 'Juan Carlos',
          recipient_phone: '3541-112233',
          shipping_method: 'pickup',
        }),
      })
    );

    expect(emitSpy).toHaveBeenCalledWith(mockCreatedOrder);
    expect(component.visible()).toBe(false);
  });
});
