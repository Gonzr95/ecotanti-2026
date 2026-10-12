import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import {
  CreateOrderInput,
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

  /**
   * Crea una nueva orden en el sistema con sus ítems y datos de entrega asociados.
   * Genera automáticamente un número de pedido único y desata el trigger de stock.
   */
  async createOrder(input: CreateOrderInput): Promise<OrderWithDetails> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${year}-${Date.now().toString().slice(-4)}${randomSuffix}`;

    // 1. Insertar orden principal
    const { data: orderData, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: null,
        status: input.status || 'delivered',
        subtotal_amount: input.subtotal_amount,
        discount_amount: input.discount_amount || 0,
        shipping_cost: input.shipping_cost || 0,
        total_amount: input.total_amount,
        payment_method: input.payment_method || 'cash',
        payment_status: input.payment_status || 'completed',
        notes: input.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderId = orderData.id;

    // 2. Insertar ítems de la orden (detalles)
    const itemsToInsert = input.items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id || null,
      bundle_id: item.bundle_id || null,
      item_type: item.item_type,
      item_name: item.item_name,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost || 0,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const { data: detailsData, error: detailsError } = await this.supabase
      .from('order_details')
      .insert(itemsToInsert)
      .select();

    if (detailsError) {
      throw detailsError;
    }

    // 3. Insertar datos de entrega / destinatario
    const deliveryToInsert = {
      order_id: orderId,
      recipient_name: input.delivery.recipient_name,
      recipient_email: input.delivery.recipient_email || 'mostrador@ecotanti.com',
      recipient_phone: input.delivery.recipient_phone || '-',
      recipient_dni: input.delivery.recipient_dni || null,
      shipping_method: input.delivery.shipping_method || 'pickup',
      shipping_cost: input.delivery.shipping_cost || 0,
      address_line: input.delivery.address_line || null,
      city: input.delivery.city || null,
      province: input.delivery.province || null,
      postal_code: input.delivery.postal_code || null,
      notes: input.delivery.notes || null,
      tracking_number: null,
    };

    const { data: deliveryData, error: deliveryError } = await this.supabase
      .from('order_deliveries')
      .insert(deliveryToInsert)
      .select()
      .single();

    if (deliveryError) {
      throw deliveryError;
    }

    return {
      ...orderData,
      items: detailsData || [],
      delivery: deliveryData,
    } as OrderWithDetails;
  }
}

