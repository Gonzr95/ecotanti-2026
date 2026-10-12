export interface Category {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
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

export interface BrandWithProductCount extends Brand {
  product_count: number;
}

export interface CreateBrandDto {
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface UpdateBrandDto {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface Product {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  /** @deprecated En desuso en favor de la tabla 'offers' y 'offer_items' */
  sale_price?: number | null;
  cost_price: number | null;
  stock: number;
  category_id: number | null;
  brand_id: number | null;
  images: string[];
  is_active: boolean;
  is_highlight: boolean;
  is_on_sale: boolean;
  applies_discount?: boolean;
  points_required?: number | null;
}

export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string | null;
  base_price: number;
  /** @deprecated */
  sale_price?: number | null;
  cost_price: number;
  stock: number;
  category_id: number;
  brand_id: number;
  images: string[];
  is_active?: boolean;
  is_highlight?: boolean;
  is_on_sale?: boolean;
  applies_discount?: boolean;
  points_required?: number | null;
}

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string | null;
  base_price?: number;
  /** @deprecated */
  sale_price?: number | null;
  cost_price?: number;
  stock?: number;
  category_id?: number;
  brand_id?: number;
  images?: string[];
  is_active?: boolean;
  is_highlight?: boolean;
  is_on_sale?: boolean;
  applies_discount?: boolean;
  points_required?: number | null;
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
  product_quantity?: number;
  product?: Product;
}

export interface BundleWithItems extends Bundle {
  items: BundleItem[];
}

export interface CreateBundleDto {
  name: string;
  slug: string;
  description?: string | null;
  total_price: number;
  discount_percentage?: number | null;
  images: string[];
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface CreateBundleItemDto {
  product_id: number;
  quantity: number;
  product_quantity?: number;
}

export interface BundleItemDraft {
  product: Product;
  quantity: number;
}

export * from './offer.models';



