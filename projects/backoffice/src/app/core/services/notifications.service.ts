import { Injectable, computed, inject, signal } from '@angular/core';
import { MessageService } from '@openng/optimus-ui/api';
import { Order, OrderWithDetails, OrdersService } from '@ecotanti/shared-catalog';

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
  private readonly ordersService = inject(OrdersService, { optional: true });

  /**
   * Colección reactiva de notificaciones en memoria
   */
  readonly notifications = signal<AppNotification[]>([]);

  /**
   * Estado reactivo del permiso de notificaciones en el navegador / PWA
   */
  readonly permissionStatus = signal<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

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

  private isRealtimeSubscribed = false;
  private unsubscribeRealtime?: () => void;

  constructor() {
    this.initRealtimeOrderSubscription();
  }

  /**
   * Inicializa la suscripción global de Supabase Realtime para capturar nuevos pedidos
   * sin importar en qué pantalla o ruta del Backoffice se encuentre el usuario.
   */
  private initRealtimeOrderSubscription(): void {
    if (this.isRealtimeSubscribed || !this.ordersService) return;
    this.isRealtimeSubscribed = true;

    try {
      this.unsubscribeRealtime = this.ordersService.subscribeToOrders((payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          this.notifyNewOrder(payload.new);
        }
      });
    } catch (err) {
      console.warn('[NotificationsService] Error suscribiendo a órdenes en tiempo real:', err);
    }
  }

  /**
   * Notifica el ingreso de una nueva orden en tiempo real
   */
  notifyNewOrder(order: Partial<Order> | OrderWithDetails | Order): void {
    if (!order || !order.id) return;

    // Deduplicación para evitar registrar dos veces el mismo pedido en ráfaga
    const alreadyExists = this.notifications().some(
      (n) => n.type === 'order' && (n.data as any)?.id === order.id
    );
    if (alreadyExists) return;

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

    // 4. Notificación del sistema (Barra de estado PWA / Navegador)
    void this.showSystemNotification(notif.title, notif.message, notif.link);
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

    void this.showSystemNotification(notif.title, notif.message, notif.link);
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
   * Reproduce un chime sonoro sintético agradable mediante Web Audio API
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
      // Ignorar silenciosamente si las políticas de autoplay bloquean el audio antes de interacción
    }
  }

  /**
   * Solicita permisos de notificación al navegador o PWA a través de una acción del usuario (click)
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        this.permissionStatus.set(permission);

        if (permission === 'granted') {
          this.messageService.add({
            severity: 'success',
            summary: 'Notificaciones Habilitadas',
            detail: 'Este dispositivo recibirá alertas de nuevas ventas en tiempo real.',
            life: 4000,
          });

          // Notificación de prueba inmediata para validar en la barra de tareas / barra de estado
          await this.showSystemNotification(
            '¡Alertas de Ventas Activas!',
            'Notificaciones configuradas correctamente en este dispositivo.'
          );
        }
        return permission;
      } catch (err) {
        console.error('[NotificationsService] Error solicitando permisos de notificación:', err);
      }
    }
    return 'denied';
  }

  /**
   * Envía una notificación de prueba manual para verificar el comportamiento en el dispositivo
   */
  async sendTestNotification(): Promise<void> {
    const testNotif: AppNotification = {
      id: `test-${Date.now()}`,
      type: 'system',
      title: '🔔 Alerta de Prueba EcoTanti',
      message: '¡Tu dispositivo está recibiendo alertas correctamente!',
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.update((prev) => [testNotif, ...prev.slice(0, 49)]);

    this.messageService.add({
      severity: 'info',
      summary: testNotif.title,
      detail: testNotif.message,
      life: 4000,
    });

    if (this.isSoundEnabled()) {
      this.playNotificationSound();
    }

    await this.showSystemNotification(testNotif.title, testNotif.message);
  }

  /**
   * Muestra una notificación nativa del sistema si el permiso fue concedido.
   * En dispositivos móviles (Android / Chrome PWA), el constructor new Notification() está prohibido
   * y lanza 'Illegal constructor'; se requiere ServiceWorkerRegistration.showNotification().
   */
  private async showSystemNotification(title: string, body: string, link?: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
      }

      if (Notification.permission !== 'granted') {
        return;
      }

      const options: NotificationOptions = {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.ico',
        tag: `order-${Date.now()}`,
        data: { link: link || '/pedidos' },
      };

      // 1. Android / PWA: Intentar mostrar a través del Service Worker registration
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && 'showNotification' in registration) {
            await registration.showNotification(title, options);
            return;
          }
        } catch (swErr) {
          console.warn('[NotificationsService] ServiceWorker showNotification falló:', swErr);
        }
      }

      // 2. Desktop Fallback: new Notification (para navegadores de escritorio estándar)
      const notif = new Notification(title, options);
      if (link) {
        notif.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      }
    } catch (err) {
      console.warn('[NotificationsService] Error mostrando notificación del sistema:', err);
    }
  }
}
