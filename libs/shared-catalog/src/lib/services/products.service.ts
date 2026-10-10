import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import { CreateProductDto, Product, UpdateProductDto } from '../models/catalog.models';
import { slugify } from '../utils/slug';

@Service()
export class ProductsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista de productos
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return (data || []) as Product[];
  }

  /**
   * Crea un nuevo producto autogenerando su slug si no fue provisto
   */
  async createProduct(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug?.trim() ? dto.slug.trim() : slugify(dto.name);
    const { data, error } = await this.supabase
      .from('products')
      .insert({
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        base_price: dto.base_price,
        sale_price: dto.sale_price != null ? dto.sale_price : null,
        cost_price: dto.cost_price,
        stock: dto.stock ?? 0,
        category_id: dto.category_id,
        brand_id: dto.brand_id,
        images: dto.images || [],
        is_active: dto.is_active ?? true,
        is_highlight: dto.is_highlight ?? false,
        is_on_sale: dto.is_on_sale ?? false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Product;
  }

  /**
   * Sube una imagen a Supabase Storage y retorna su URL pública
   */
  async uploadProductImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // 1. Usar el bucket configurado en environment (por defecto 'media')
    const primaryBucketName = this.supabase.storageConfig?.bucket || 'media';
    const primaryBucket = this.supabase.storage.from(primaryBucketName);
    const { error: primaryError } = await primaryBucket.upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (!primaryError) {
      const { data: publicData } = primaryBucket.getPublicUrl(filePath);
      return publicData.publicUrl;
    }

    // 2. Fallback a bucket alternativo ('products' si el primario era 'media' o viceversa)
    const fallbackBucketName = primaryBucketName === 'media' ? 'products' : 'media';
    const fallbackBucket = this.supabase.storage.from(fallbackBucketName);
    const { error: fallbackError } = await fallbackBucket.upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (fallbackError) {
      throw new Error(
        `Error al subir imagen: ni el bucket '${primaryBucketName}' ni '${fallbackBucketName}' están disponibles. ` +
        `Asegúrate de haber creado el bucket público en Supabase Storage.`
      );
    }

    const { data: fallbackData } = fallbackBucket.getPublicUrl(filePath);
    return fallbackData.publicUrl;
  }
}

