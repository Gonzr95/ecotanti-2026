import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import {
  Order,
  OrderDelivery,
  OrderStatus,
  OrderWithDetails,
  PaymentStatus,
} from '../models/order.models';

export interface OrderRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: Order | null;
  old: Order | null;
}

@Service()
export class OrdersService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista completa de órdenes junto con sus ítems y datos de entrega
   */
  async getOrders(): Promise<OrderWithDetails[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, items:order_details(*), delivery:order_deliveries(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => ({
      ...row,
      items: row.items || [],
      delivery: Array.isArray(row.delivery) ? row.delivery[0] : row.delivery,
    })) as OrderWithDetails[];
  }

  /**
   * Obtiene una orden por su ID con todo el detalle asociado
   */
  async getOrderById(id: number): Promise<OrderWithDetails> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, items:order_details(*), delivery:order_deliveries(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      items: data.items || [],
      delivery: Array.isArray(data.delivery) ? data.delivery[0] : data.delivery,
    } as OrderWithDetails;
  }

  /**
   * Actualiza el estado operativo de una orden (pending, preparing, shipped, delivered, cancelled, etc.)
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Order;
  }

  /**
   * Actualiza el estado financiero del cobro de forma independiente (pending, completed, failed, refunded)
   */
  async updatePaymentStatus(id: number, paymentStatus: PaymentStatus): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Order;
  }

  /**
   * Actualiza el número de seguimiento (tracking) en la entrega del pedido
   */
  async updateTrackingNumber(orderId: number, trackingNumber: string): Promise<OrderDelivery> {
    const { data, error } = await this.supabase
      .from('order_deliveries')
      .update({
        tracking_number: trackingNumber.trim() || null,
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as OrderDelivery;
  }

  /**
   * Se suscribe al canal de cambios en tiempo real de la tabla 'orders'
   * Retorna una función para cancelar la suscripción
   */
  subscribeToOrders(callback: (payload: OrderRealtimePayload) => void): () => void {
    const channelName = `orders-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

