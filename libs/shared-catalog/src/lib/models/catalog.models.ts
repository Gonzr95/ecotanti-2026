export interface Category {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export interface Brand {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface Product {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  cost_price: number | null;
  stock: number;
  category_id: number | null;
  brand_id: number | null;
  images: string[];
  is_active: boolean;
  is_highlight: boolean;
  is_on_sale: boolean;
}

export interface Bundle {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  total_price: number;
  discount_percentage: number | null;
  images: string[];
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface BundleItem {
  bundle_id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface BundleWithItems extends Bundle {
  items: BundleItem[];
}

