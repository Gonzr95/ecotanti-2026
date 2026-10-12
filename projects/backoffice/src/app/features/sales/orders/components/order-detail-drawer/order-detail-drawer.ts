import {
  Component,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from '@openng/optimus-ui/drawer';
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
  selector: 'app-order-detail-drawer',
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    DrawerModule,
    Select,
    Button,
    InputText,
    Dialog,
  ],
  templateUrl: './order-detail-drawer.html',
})
export class OrderDetailDrawerComponent {
  /**
   * Visibilidad bidireccional del Drawer lateral
   */
  readonly visible = model<boolean>(false);

  /**
   * Orden actualmente seleccionada
   */
  readonly order = input<OrderWithDetails | null>(null);

  /**
   * Indicador de actualización en segundo plano
   */
  readonly isUpdating = input<boolean>(false);

  /**
   * Eventos emitidos hacia el contenedor padre
   */
  readonly statusChange = output<{ order: OrderWithDetails; newStatus: OrderStatus }>();
  readonly paymentStatusChange = output<{ order: OrderWithDetails; newStatus: PaymentStatus }>();
  readonly trackingUpdate = output<{ order: OrderWithDetails; trackingNumber: string }>();

  /**
   * Modelo reactivo para el número de seguimiento
   */
  readonly trackingInput = signal<string>('');

  /**
   * Estado de Diálogo de Cancelación de Seguridad
   */
  readonly isCancelDialogOpen = signal<boolean>(false);

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

  constructor() {
    // Sincronizar input de tracking cuando cambia la orden
    effect(() => {
      const currentOrder = this.order();
      this.trackingInput.set(currentOrder?.delivery?.tracking_number || '');
    });
  }

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
   * Genera el enlace directo a WhatsApp para contactar al cliente
   */
  getWhatsAppUrl(): string {
    const currentOrder = this.order();
    if (!currentOrder || !currentOrder.delivery?.recipient_phone) return '';

    // Limpiar caracteres no numéricos del teléfono
    const cleanPhone = currentOrder.delivery.recipient_phone.replace(/\D/g, '');
    const clientName = currentOrder.delivery.recipient_name || 'Estimado cliente';
    const message = `Hola ${clientName}, nos comunicamos desde EcoTanti sobre tu pedido #${currentOrder.order_number}.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Cambio de estado operativo
   */
  onStatusChange(newStatus: OrderStatus): void {
    const currentOrder = this.order();
    if (!currentOrder || currentOrder.status === newStatus) return;

    if (newStatus === 'cancelled') {
      this.isCancelDialogOpen.set(true);
      return;
    }

    this.statusChange.emit({ order: currentOrder, newStatus });
  }

  /**
   * Confirmación de anulación de orden
   */
  confirmCancelOrder(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.statusChange.emit({ order: currentOrder, newStatus: 'cancelled' });
    this.closeCancelDialog();
  }

  closeCancelDialog(): void {
    this.isCancelDialogOpen.set(false);
  }

  /**
   * Cambio de estado de cobro
   */
  onPaymentStatusChange(newStatus: PaymentStatus): void {
    const currentOrder = this.order();
    if (!currentOrder || currentOrder.payment_status === newStatus) return;

    this.paymentStatusChange.emit({ order: currentOrder, newStatus });
  }

  /**
   * Guarda o actualiza el número de seguimiento
   */
  saveTracking(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    const tracking = this.trackingInput().trim();
    this.trackingUpdate.emit({ order: currentOrder, trackingNumber: tracking });
  }

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible.set(false);
  }
}

