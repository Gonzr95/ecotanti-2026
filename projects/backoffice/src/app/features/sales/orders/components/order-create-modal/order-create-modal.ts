import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@openng/optimus-ui/dialog';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { InputNumber } from '@openng/optimus-ui/inputnumber';
import { Select } from '@openng/optimus-ui/select';
import { MessageService } from '@openng/optimus-ui/api';
import {
  Bundle,
  BundlesService,
  CreateOrderInput,
  OrderStatus,
  OrderWithDetails,
  OrdersService,
  PaymentStatus,
  Product,
  ProductsService,
  ShippingMethod,
} from '@ecotanti/shared-catalog';

export interface UnifiedCatalogItem {
  id: string;
  rawId: number;
  type: 'product' | 'bundle';
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  image: string | null;
}

export interface CartItem {
  id: string;
  rawId: number;
  item_type: 'product' | 'bundle';
  product_id: number | null;
  bundle_id: number | null;
  name: string;
  image: string | null;
  unit_price: number;
  unit_cost: number;
  available_stock: number;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-order-create-modal',
  imports: [
    FormsModule,
    DecimalPipe,
    Dialog,
    Button,
    InputText,
    InputNumber,
    Select,
  ],
  templateUrl: './order-create-modal.html',
})
export class OrderCreateModalComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly bundlesService = inject(BundlesService);
  private readonly messageService = inject(MessageService);

  /**
   * Visibilidad bidireccional del modal
   */
  readonly visible = model<boolean>(false);

  /**
   * Evento emitido al crearse la orden exitosamente
   */
  readonly orderCreated = output<OrderWithDetails>();

  /**
   * Catálogo cargado desde Supabase
   */
  readonly products = signal<Product[]>([]);
  readonly bundles = signal<Bundle[]>([]);
  readonly isLoadingCatalog = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  /**
   * Filtros del catálogo
   */
  readonly searchQuery = signal<string>('');
  readonly catalogFilter = signal<'all' | 'products' | 'bundles'>('all');

  /**
   * Canasta / Carrito de venta
   */
  readonly cartItems = signal<CartItem[]>([]);

  /**
   * Datos del cliente (solicitados en mostrador)
   */
  readonly recipientName = signal<string>('');
  readonly recipientPhone = signal<string>('');
  readonly recipientEmail = signal<string>('');
  readonly orderNotes = signal<string>('');

  /**
   * Modalidad de entrega y logística
   */
  readonly shippingMethod = signal<ShippingMethod>('pickup');
  readonly shippingAddress = signal<string>('');
  readonly shippingCity = signal<string>('Tanti');
  readonly shippingCost = signal<number>(0);

  /**
   * Condiciones de pago y estado operativo
   */
  readonly paymentMethod = signal<string>('cash');
  readonly paymentStatus = signal<PaymentStatus>('completed');
  readonly orderStatus = signal<OrderStatus>('delivered');

  /**
   * Opciones para selectores
   */
  readonly paymentMethodOptions = [
    { value: 'cash', label: 'Efectivo', icon: 'pi pi-money-bill' },
    { value: 'transfer', label: 'Transferencia Bancaria', icon: 'pi pi-send' },
    { value: 'mercadopago', label: 'MercadoPago / QR', icon: 'pi pi-qrcode' },
    { value: 'debit_card', label: 'Tarjeta de Débito', icon: 'pi pi-credit-card' },
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: 'pi pi-credit-card' },
  ];

  readonly paymentStatusOptions = [
    { value: 'completed', label: 'Pagado' },
    { value: 'pending', label: 'Pago Pendiente' },
  ];

  readonly orderStatusOptions = [
    { value: 'delivered', label: 'Entregado en Mostrador' },
    { value: 'preparing', label: 'En Preparación' },
    { value: 'ready_for_pickup', label: 'Listo para Retirar' },
    { value: 'pending', label: 'Pendiente' },
  ];

  readonly shippingMethodOptions = [
    { value: 'pickup', label: 'Retiro en Local (Mostrador)' },
    { value: 'local_delivery', label: 'Envío a Domicilio' },
  ];

  constructor() {
    // Al abrir el modal, asegurar carga fresca del catálogo si está vacío
    effect(() => {
      if (this.visible() && this.products().length === 0) {
        this.loadCatalog();
      }
    });

    // Ajustar estado por defecto según modalidad de entrega
    effect(() => {
      const method = this.shippingMethod();
      if (method === 'pickup') {
        this.orderStatus.set('delivered');
        this.shippingCost.set(0);
      } else {
        this.orderStatus.set('preparing');
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  /**
   * Carga productos y combos activos con stock
   */
  async loadCatalog(): Promise<void> {
    this.isLoadingCatalog.set(true);
    try {
      const [prods, bnds] = await Promise.all([
        this.productsService.getProducts(),
        this.bundlesService.getBundles(),
      ]);

      // Filtrar activos
      this.products.set(prods.filter((p) => p.is_active));
      this.bundles.set(bnds.filter((b) => b.is_active));
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      this.isLoadingCatalog.set(false);
    }
  }

  /**
   * Catálogo unificado de productos y combos
   */
  readonly unifiedCatalog = computed<UnifiedCatalogItem[]>(() => {
    const pItems: UnifiedCatalogItem[] = this.products().map((p) => ({
      id: `p-${p.id}`,
      rawId: p.id,
      type: 'product',
      name: p.name,
      price: p.base_price,
      cost_price: p.cost_price || 0,
      stock: p.stock || 0,
      image: p.images && p.images.length > 0 ? p.images[0] : null,
    }));

    const bItems: UnifiedCatalogItem[] = this.bundles().map((b) => ({
      id: `b-${b.id}`,
      rawId: b.id,
      type: 'bundle',
      name: b.name,
      price: b.total_price,
      cost_price: 0,
      stock: 99,
      image: b.images && b.images.length > 0 ? b.images[0] : null,
    }));

    return [...pItems, ...bItems];
  });

  /**
   * Catálogo filtrado por buscador y tipo
   */
  readonly filteredCatalog = computed<UnifiedCatalogItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.catalogFilter();

    return this.unifiedCatalog().filter((item) => {
      if (filter === 'products' && item.type !== 'product') return false;
      if (filter === 'bundles' && item.type !== 'bundle') return false;

      if (query && !item.name.toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  });

  /**
   * Cálculos contables de la canasta
   */
  readonly subtotal = computed<number>(() => {
    return this.cartItems().reduce((acc, item) => acc + item.subtotal, 0);
  });

  readonly totalShipping = computed<number>(() => {
    return this.shippingMethod() === 'pickup' ? 0 : Number(this.shippingCost() || 0);
  });

  readonly total = computed<number>(() => {
    return this.subtotal() + this.totalShipping();
  });

  readonly isFormValid = computed<boolean>(() => {
    const hasItems = this.cartItems().length > 0;
    const hasClientName = this.recipientName().trim().length >= 2;
    const hasValidDelivery =
      this.shippingMethod() === 'pickup' || this.shippingAddress().trim().length >= 3;

    return hasItems && hasClientName && hasValidDelivery && !this.isSubmitting();
  });

  /**
   * Agrega un ítem del catálogo al carrito
   */
  addToCart(item: UnifiedCatalogItem): void {
    if (item.stock <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Stock',
        detail: `"${item.name}" no tiene unidades disponibles.`,
      });
      return;
    }

    const currentCart = this.cartItems();
    const existing = currentCart.find((ci) => ci.id === item.id);

    if (existing) {
      if (existing.quantity >= item.stock) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Límite de Stock',
          detail: `Solo hay ${item.stock} unidades disponibles.`,
        });
        return;
      }

      this.cartItems.update((list) =>
        list.map((ci) =>
          ci.id === item.id
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                subtotal: (ci.quantity + 1) * ci.unit_price,
              }
            : ci
        )
      );
    } else {
      const newItem: CartItem = {
        id: item.id,
        rawId: item.rawId,
        item_type: item.type,
        product_id: item.type === 'product' ? item.rawId : null,
        bundle_id: item.type === 'bundle' ? item.rawId : null,
        name: item.name,
        image: item.image,
        unit_price: item.price,
        unit_cost: item.cost_price,
        available_stock: item.stock,
        quantity: 1,
        subtotal: item.price,
      };

      this.cartItems.update((list) => [...list, newItem]);
    }
  }

  /**
   * Modifica la cantidad de un ítem en la canasta
   */
  updateQuantity(cartItemId: string, newQty: number): void {
    if (newQty < 1) return;

    this.cartItems.update((list) =>
      list.map((ci) => {
        if (ci.id === cartItemId) {
          const qty = Math.min(newQty, ci.available_stock);
          return {
            ...ci,
            quantity: qty,
            subtotal: qty * ci.unit_price,
          };
        }
        return ci;
      })
    );
  }

  /**
   * Remueve un ítem de la canasta
   */
  removeFromCart(cartItemId: string): void {
    this.cartItems.update((list) => list.filter((ci) => ci.id !== cartItemId));
  }

  /**
   * Limpia toda la canasta
   */
  clearCart(): void {
    this.cartItems.set([]);
  }

  /**
   * Envía la orden a Supabase
   */
  async submitOrder(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSubmitting.set(true);

    try {
      const orderPayload: CreateOrderInput = {
        status: this.orderStatus(),
        payment_status: this.paymentStatus(),
        payment_method: this.paymentMethod(),
        subtotal_amount: this.subtotal(),
        discount_amount: 0,
        shipping_cost: this.totalShipping(),
        total_amount: this.total(),
        notes: this.orderNotes().trim() || null,
        items: this.cartItems().map((ci) => ({
          item_type: ci.item_type,
          product_id: ci.product_id,
          bundle_id: ci.bundle_id,
          item_name: ci.name,
          unit_price: ci.unit_price,
          unit_cost: ci.unit_cost,
          quantity: ci.quantity,
          subtotal: ci.subtotal,
        })),
        delivery: {
          recipient_name: this.recipientName().trim(),
          recipient_phone: this.recipientPhone().trim() || '-',
          recipient_email: this.recipientEmail().trim() || 'mostrador@ecotanti.com',
          shipping_method: this.shippingMethod(),
          shipping_cost: this.totalShipping(),
          address_line:
            this.shippingMethod() === 'pickup'
              ? 'Mostrador Local EcoTanti'
              : this.shippingAddress().trim(),
          city: this.shippingCity().trim(),
          province: 'Córdoba',
          postal_code: '5155',
          notes: this.orderNotes().trim() || null,
        },
      };

      const created = await this.ordersService.createOrder(orderPayload);

      this.messageService.add({
        severity: 'success',
        summary: 'Venta Registrada',
        detail: `Pedido #${created.order_number} generado con éxito.`,
      });

      this.orderCreated.emit(created);
      this.close();
      this.resetForm();
    } catch (err) {
      console.error('Error al registrar venta presencial:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo registrar la venta. Intente nuevamente.',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.cartItems.set([]);
    this.recipientName.set('');
    this.recipientPhone.set('');
    this.recipientEmail.set('');
    this.orderNotes.set('');
    this.shippingMethod.set('pickup');
    this.shippingAddress.set('');
    this.shippingCity.set('Tanti');
    this.shippingCost.set(0);
    this.paymentMethod.set('cash');
    this.paymentStatus.set('completed');
    this.orderStatus.set('delivered');
    this.searchQuery.set('');
  }

  close(): void {
    this.visible.set(false);
  }
}
