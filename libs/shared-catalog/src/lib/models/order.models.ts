export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export type ShippingMethod =
  | 'pickup'
  | 'local_delivery'
  | 'national_shipping';

export interface Order {
  id: number;
  created_at: string;
  updated_at: string | null;
  order_number: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal_amount: number;
  discount_id: number | null;
  discount_amount: number;
  discount_applied?: boolean | null;
  credit_used: number;
  shipping_cost: number;
  total_amount: number;
  final_paid_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  notes: string | null;
}

export interface OrderDetail {
  id: number;
  order_id: number;
  product_id: number | null;
  bundle_id: number | null;
  offer_item_id: number | null;
  item_type: 'product' | 'bundle';
  item_name: string;
  regular_price: number;
  unit_price: number;
  cost_price: number;
  /** Alias de compatibilidad con código anterior */
  unit_cost?: number;
  quantity: number;
  subtotal: number;
  created_at?: string;
}

export interface OrderDelivery {
  id: number;
  order_id: number;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_dni: string | null;
  shipping_method: ShippingMethod;
  shipping_cost: number;
  address_line: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  items: OrderDetail[];
  delivery?: OrderDelivery;
}

export interface CreateOrderItemInput {
  item_type: 'product' | 'bundle';
  product_id?: number | null;
  bundle_id?: number | null;
  item_name: string;
  regular_price?: number;
  unit_price: number;
  cost_price?: number;
  unit_cost?: number;
  quantity: number;
  subtotal: number;
}

export interface CreateOrderDeliveryInput {
  recipient_name: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_dni?: string | null;
  shipping_method: ShippingMethod;
  shipping_cost: number;
  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  notes?: string | null;
}

export interface CreateOrderInput {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method: string;
  subtotal_amount: number;
  discount_amount?: number;
  shipping_cost?: number;
  total_amount: number;
  notes?: string | null;
  items: CreateOrderItemInput[];
  delivery: CreateOrderDeliveryInput;
}

