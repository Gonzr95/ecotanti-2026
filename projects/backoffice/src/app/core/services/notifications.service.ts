import { Injectable, computed, inject, signal } from '@angular/core';
import { MessageService } from '@openng/optimus-ui/api';
import { Order, OrderWithDetails } from '@ecotanti/shared-catalog';

export type NotificationType = 'order' | 'inventory' | 'user' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  data?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly messageService = inject(MessageService);

  /**
   * Colección reactiva de notificaciones en memoria
   */
  readonly notifications = signal<AppNotification[]>([]);

  /**
   * Contador de notificaciones no leídas
   */
  readonly unreadCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  /**
   * Conteo específico de órdenes pendientes o nuevas
   */
  readonly unreadOrdersCount = computed(() => {
    return this.notifications().filter((n) => n.type === 'order' && !n.read).length;
  });

  /**
   * Control de sonido
   */
  readonly isSoundEnabled = signal<boolean>(true);

  /**
   * Notifica el ingreso de una nueva orden en tiempo real
   */
  notifyNewOrder(order: Partial<Order> | OrderWithDetails | Order): void {
    const orderNumber = order.order_number || `#${order.id}`;
    const amount = Number(order.total_amount || 0).toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    });

    const notif: AppNotification = {
      id: `order-${order.id}-${Date.now()}`,
      type: 'order',
      title: '¡Nuevo Pedido Recibido!',
      message: `Orden ${orderNumber} por ${amount}`,
      timestamp: new Date().toISOString(),
      read: false,
      link: '/pedidos',
      data: order,
    };

    // 1. Agregar a la lista de notificaciones (al inicio)
    this.notifications.update((prev) => [notif, ...prev.slice(0, 49)]);

    // 2. Notificación flotante Toast in-app
    this.messageService.add({
      severity: 'success',
      summary: notif.title,
      detail: notif.message,
      life: 6000,
    });

    // 3. Reproducir audio chime
    if (this.isSoundEnabled()) {
      this.playNotificationSound();
    }

    // 4. Notificación del sistema (PWA / Navegador)
    this.showSystemNotification(notif.title, notif.message, notif.link);
  }

  /**
   * Agrega una notificación genérica al sistema
   */
  addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): void {
    const notif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.update((prev) => [notif, ...prev.slice(0, 49)]);

    this.messageService.add({
      severity: notification.type === 'order' ? 'success' : 'info',
      summary: notif.title,
      detail: notif.message,
      life: 5000,
    });

    if (this.isSoundEnabled()) {
      this.playNotificationSound();
    }

    this.showSystemNotification(notif.title, notif.message, notif.link);
  }

  /**
   * Marca una notificación específica como leída
   */
  markAsRead(id: string): void {
    this.notifications.update((items) =>
      items.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.notifications.update((items) =>
      items.map((n) => ({ ...n, read: true }))
    );
  }

  /**
   * Limpia el listado de notificaciones
   */
  clearAll(): void {
    this.notifications.set([]);
  }

  /**
   * Reproduce un chime sonoro agradable y sutil mediante Web Audio API sintético
   */
  playNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primer tono (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Segundo tono (A5 - 880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch {
      // Si el navegador bloquea audio antes de la primera interacción del usuario, ignorar silenciosamente
    }
  }

  /**
   * Solicita permisos de notificación al navegador o PWA
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Muestra una notificación nativa del sistema si el permiso fue concedido
   */
  private showSystemNotification(title: string, body: string, link?: string): void {
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
        });

        if (link) {
          notif.onclick = () => {
            window.focus();
            window.location.href = link;
          };
        }
      }
    } catch {
      // Ignorar restricciones en entornos sin soporte
    }
  }
}
