export interface Discount {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  code: string | null;
  description: string | null;
  discount_percentage: number | null;
  fixed_discount: number | null;
  category_id: number | null;
  min_purchase_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface CreateDiscountDto {
  name: string;
  code?: string | null;
  description?: string | null;
  discount_percentage?: number | null;
  fixed_discount?: number | null;
  category_id?: number | null;
  min_purchase_amount?: number | null;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface UpdateDiscountDto {
  name?: string;
  code?: string | null;
  description?: string | null;
  discount_percentage?: number | null;
  fixed_discount?: number | null;
  category_id?: number | null;
  min_purchase_amount?: number | null;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}


