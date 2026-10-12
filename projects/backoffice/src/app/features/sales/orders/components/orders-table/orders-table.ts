import {
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from '@openng/optimus-ui/table';
import { Select } from '@openng/optimus-ui/select';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Dialog } from '@openng/optimus-ui/dialog';
import {
  OrderStatus,
  OrderWithDetails,
  PaymentStatus,
  ShippingMethod,
} from '@ecotanti/shared-catalog';

export interface StatusOption {
  value: OrderStatus;
  label: string;
  icon: string;
  badgeClass: string;
}

export interface PaymentStatusOption {
  value: PaymentStatus;
  label: string;
  badgeClass: string;
}

@Component({
  selector: 'app-orders-table',
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    TableModule,
    Select,
    Button,
    InputText,
    Dialog,
  ],
  templateUrl: './orders-table.html',
})
export class OrdersTableComponent {
  /**
   * Colección de pedidos suministrada por el contenedor padre
   */
  readonly orders = input<OrderWithDetails[]>([]);
  readonly isLoading = input<boolean>(false);

  /**
   * Eventos emitidos hacia el padre
   */
  readonly statusChange = output<{ order: OrderWithDetails; newStatus: OrderStatus }>();
  readonly paymentStatusChange = output<{ order: OrderWithDetails; newStatus: PaymentStatus }>();
  readonly orderSelected = output<OrderWithDetails>();

  /**
   * Filtros de la tabla
   */
  readonly searchQuery = signal<string>('');
  readonly selectedStatusFilter = signal<OrderStatus | 'all'>('all');
  readonly selectedPaymentFilter = signal<PaymentStatus | 'all'>('all');
  readonly selectedShippingFilter = signal<ShippingMethod | 'all'>('all');

  /**
   * Opciones de Paginación
   */
  readonly rows = signal<number>(10);
  readonly first = signal<number>(0);
  readonly rowsPerPageOptions = [5, 10, 20, 50];

  /**
   * Estado de Diálogo de Cancelación de Seguridad
   */
  readonly isCancelDialogOpen = signal<boolean>(false);
  readonly orderPendingCancellation = signal<OrderWithDetails | null>(null);

  /**
   * Opciones de Estados Operativos del Pedido
   */
  readonly statusOptions: StatusOption[] = [
    {
      value: 'pending',
      label: 'Pendiente',
      icon: 'pi pi-clock',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      value: 'preparing',
      label: 'En Preparación',
      icon: 'pi pi-box',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      value: 'ready_for_pickup',
      label: 'Listo p/ Retirar',
      icon: 'pi pi-shopping-bag',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      value: 'shipped',
      label: 'Enviado',
      icon: 'pi pi-send',
      badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    {
      value: 'delivered',
      label: 'Entregado',
      icon: 'pi pi-check-circle',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      value: 'cancelled',
      label: 'Cancelado',
      icon: 'pi pi-times-circle',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
  ];

  /**
   * Opciones de Estados de Cobro / Pago
   */
  readonly paymentStatusOptions: PaymentStatusOption[] = [
    {
      value: 'pending',
      label: 'Pago Pendiente',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      value: 'completed',
      label: 'Pagado',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      value: 'failed',
      label: 'Pago Fallido',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      value: 'refunded',
      label: 'Reembolsado',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    },
  ];

  /**
   * Opciones de Métodos de Envío
   */
  readonly shippingOptions = [
    { value: 'pickup', label: 'Retiro en Local' },
    { value: 'local_delivery', label: 'Envío Local' },
    { value: 'national_shipping', label: 'Envío Nacional' },
  ];

  /**
   * Lista filtrada de órdenes aplicando buscador multicriterio y filtros por columna
   */
  readonly filteredOrders = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const statusF = this.selectedStatusFilter();
    const paymentF = this.selectedPaymentFilter();
    const shippingF = this.selectedShippingFilter();

    return this.orders().filter((order) => {
      // 1. Buscador multicriterio
      if (query) {
        const orderNumber = (order.order_number || '').toLowerCase();
        const clientName = (order.delivery?.recipient_name || '').toLowerCase();
        const email = (order.delivery?.recipient_email || '').toLowerCase();
        const phone = (order.delivery?.recipient_phone || '').toLowerCase();
        const address = (order.delivery?.address_line || '').toLowerCase();
        const city = (order.delivery?.city || '').toLowerCase();

        const matches =
          orderNumber.includes(query) ||
          clientName.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          address.includes(query) ||
          city.includes(query);

        if (!matches) return false;
      }

      // 2. Filtro de Estado
      if (statusF !== 'all' && order.status !== statusF) {
        return false;
      }

      // 3. Filtro de Pago
      if (paymentF !== 'all' && order.payment_status !== paymentF) {
        return false;
      }

      // 4. Filtro de Envío
      if (shippingF !== 'all' && order.delivery?.shipping_method !== shippingF) {
        return false;
      }

      return true;
    });
  });

  /**
   * Helper para obtener datos visuales del estado
   */
  getStatusMeta(status: OrderStatus): StatusOption {
    return (
      this.statusOptions.find((opt) => opt.value === status) ?? {
        value: status,
        label: status,
        icon: 'pi pi-circle',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      }
    );
  }

  /**
   * Helper para obtener datos visuales del pago
   */
  getPaymentStatusMeta(status: PaymentStatus): PaymentStatusOption {
    return (
      this.paymentStatusOptions.find((opt) => opt.value === status) ?? {
        value: status,
        label: status,
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      }
    );
  }

  /**
   * Helper para traducir método de envío
   */
  getShippingLabel(method?: ShippingMethod | string): string {
    if (method === 'pickup') return 'Retiro en Local';
    if (method === 'local_delivery') return 'Envío Local';
    if (method === 'national_shipping') return 'Envío Nacional';
    return method || 'No especificado';
  }

  /**
   * Manejador de cambio de estado en vivo desde el dropdown de la fila
   */
  onStatusDropdownChange(order: OrderWithDetails, newStatus: OrderStatus): void {
    if (order.status === newStatus) return;

    if (newStatus === 'cancelled') {
      // Requerir confirmación de seguridad
      this.orderPendingCancellation.set(order);
      this.isCancelDialogOpen.set(true);
      return;
    }

    // Actualización inmediata
    this.statusChange.emit({ order, newStatus });
  }

  /**
   * Confirma la anulación de la orden
   */
  confirmCancelOrder(): void {
    const order = this.orderPendingCancellation();
    if (!order) return;

    this.statusChange.emit({ order, newStatus: 'cancelled' });
    this.closeCancelDialog();
  }

  closeCancelDialog(): void {
    this.isCancelDialogOpen.set(false);
    this.orderPendingCancellation.set(null);
  }

  /**
   * Cambia el estado de cobro
   */
  onPaymentStatusChange(order: OrderWithDetails, newStatus: PaymentStatus): void {
    if (order.payment_status === newStatus) return;
    this.paymentStatusChange.emit({ order, newStatus });
  }

  /**
   * Limpia todos los filtros de búsqueda
   */
  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedStatusFilter.set('all');
    this.selectedPaymentFilter.set('all');
    this.selectedShippingFilter.set('all');
    this.first.set(0);
  }
}
