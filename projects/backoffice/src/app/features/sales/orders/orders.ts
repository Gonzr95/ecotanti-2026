import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Button } from '@openng/optimus-ui/button';
import { Toast } from '@openng/optimus-ui/toast';
import { MessageService } from '@openng/optimus-ui/api';
import {
  OrderStatus,
  OrderWithDetails,
  OrdersService,
  PaymentStatus,
} from '@ecotanti/shared-catalog';
import { NotificationsService } from '../../../core/services/notifications.service';
import { OrdersTableComponent } from './components/orders-table/orders-table';
import { OrderDetailDrawerComponent } from './components/order-detail-drawer/order-detail-drawer';

@Component({
  selector: 'app-orders',
  imports: [
    DecimalPipe,
    Button,
    Toast,
    OrdersTableComponent,
    OrderDetailDrawerComponent,
  ],
  templateUrl: './orders.html',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(OrdersService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly messageService = inject(MessageService);

  readonly orders = signal<OrderWithDetails[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isUpdating = signal<boolean>(false);

  readonly selectedOrder = signal<OrderWithDetails | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);

  private realtimeSubscription: any = null;

  // Métricas calculadas para tarjetas de resumen
  readonly totalOrders = computed(() => this.orders().length);
  readonly pendingOrders = computed(() => this.orders().filter((o) => o.status === 'pending').length);
  readonly preparingOrders = computed(() => this.orders().filter((o) => o.status === 'preparing').length);
  readonly pendingPaymentOrders = computed(() => this.orders().filter((o) => o.payment_status === 'pending').length);
  readonly totalRevenue = computed(() =>
    this.orders()
      .filter((o) => o.payment_status === 'completed')
      .reduce((acc, o) => acc + (o.total_amount || 0), 0)
  );

  async ngOnInit(): Promise<void> {
    await this.loadOrders();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
  }

  async loadOrders(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.ordersService.getOrders();
      this.orders.set(data);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los pedidos.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private setupRealtimeSubscription(): void {
    this.realtimeSubscription = this.ordersService.subscribeToOrders(async (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newOrderRecord = payload.new;
        this.notificationsService.notifyNewOrder({
          id: newOrderRecord.id,
          order_number: newOrderRecord.order_number,
          total_amount: newOrderRecord.total_amount,
        });

        await this.loadOrders();
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        await this.loadOrders();

        const currentSelected = this.selectedOrder();
        if (currentSelected && currentSelected.id === payload.new.id) {
          const freshOrder = await this.ordersService.getOrderById(payload.new.id);
          if (freshOrder) {
            this.selectedOrder.set(freshOrder);
          }
        }
      }
    });
  }

  onOrderSelected(order: OrderWithDetails): void {
    this.selectedOrder.set(order);
    this.isDrawerOpen.set(true);
  }

  async handleStatusChange({ order, newStatus }: { order: OrderWithDetails; newStatus: OrderStatus }): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.ordersService.updateOrderStatus(order.id, newStatus);

      this.orders.update((list) =>
        list.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
      );

      if (this.selectedOrder()?.id === order.id) {
        this.selectedOrder.update((curr) => (curr ? { ...curr, status: newStatus } : null));
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `El pedido #${order.order_number} cambió a ${this.getStatusLabel(newStatus)}.`,
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado de la orden.',
      });
    } finally {
      this.isUpdating.set(false);
    }
  }

  async handlePaymentStatusChange({ order, newStatus }: { order: OrderWithDetails; newStatus: PaymentStatus }): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.ordersService.updatePaymentStatus(order.id, newStatus);

      this.orders.update((list) =>
        list.map((o) => (o.id === order.id ? { ...o, payment_status: newStatus } : o))
      );

      if (this.selectedOrder()?.id === order.id) {
        this.selectedOrder.update((curr) => (curr ? { ...curr, payment_status: newStatus } : null));
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Cobro Actualizado',
        detail: `El estado de pago del pedido #${order.order_number} es ahora ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error actualizando pago:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado de pago.',
      });
    } finally {
      this.isUpdating.set(false);
    }
  }

  async handleTrackingUpdate({ order, trackingNumber }: { order: OrderWithDetails; trackingNumber: string }): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.ordersService.updateTrackingNumber(order.id, trackingNumber);

      this.orders.update((list) =>
        list.map((o) => {
          if (o.id === order.id && o.delivery) {
            return {
              ...o,
              delivery: { ...o.delivery, tracking_number: trackingNumber },
            };
          }
          return o;
        })
      );

      if (this.selectedOrder()?.id === order.id) {
        this.selectedOrder.update((curr) => {
          if (curr && curr.delivery) {
            return {
              ...curr,
              delivery: { ...curr.delivery, tracking_number: trackingNumber },
            };
          }
          return curr;
        });
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Tracking Guardado',
        detail: `Número de seguimiento actualizado para #${order.order_number}.`,
      });
    } catch (error) {
      console.error('Error guardando tracking:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar el número de seguimiento.',
      });
    } finally {
      this.isUpdating.set(false);
    }
  }

  private getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      preparing: 'En Preparación',
      ready_for_pickup: 'Listo para Retirar',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }
}
