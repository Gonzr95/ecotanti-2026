import { Bundle, Product } from './catalog.models';

export interface Offer {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  logo_url: string | null;
  promotion_starts_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  discount_percentage: number | null;
  is_active: boolean;
}

export interface OfferItem {
  id: number;
  offer_id: number;
  product_id: number | null;
  bundle_id: number | null;
  price: number | null;
  is_active: boolean;
  product?: Product;
  bundle?: Bundle;
}

export interface OfferWithItems extends Offer {
  items: OfferItem[];
}

export interface CreateOfferDto {
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  promotion_starts_at?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  discount_percentage?: number | null;
  is_active?: boolean;
}

export interface UpdateOfferDto {
  name?: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  promotion_starts_at?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  discount_percentage?: number | null;
  is_active?: boolean;
}

export interface CreateOfferItemDto {
  offer_id?: number;
  product_id?: number | null;
  bundle_id?: number | null;
  price?: number | null;
  is_active?: boolean;
}

export interface OfferItemDraft {
  type: 'product' | 'bundle';
  product_id?: number | null;
  bundle_id?: number | null;
  name: string;
  image?: string | null;
  regular_price: number;
  offer_price: number;
  calculated_discount: number;
  is_active: boolean;
}

