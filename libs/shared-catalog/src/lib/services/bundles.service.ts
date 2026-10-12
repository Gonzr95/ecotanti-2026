import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import {
  Bundle,
  BundleWithItems,
  CreateBundleDto,
  CreateBundleItemDto,
  Product,
} from '../models/catalog.models';
import { slugify } from '../utils/slug';

@Service()
export class BundlesService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista completa de combos
   */
  async getBundles(): Promise<Bundle[]> {
    const { data, error } = await this.supabase
      .from('bundles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Bundle[];
  }

  /**
   * Obtiene un combo por ID junto con los ítems y productos que lo integran
   */
  async getBundleById(id: number): Promise<BundleWithItems> {
    const { data: bundleData, error: bundleError } = await this.supabase
      .from('bundles')
      .select('*')
      .eq('id', id)
      .single();

    if (bundleError) {
      throw bundleError;
    }

    const { data: itemsData, error: itemsError } = await this.supabase
      .from('bundle_items')
      .select('bundle_id, product_id, quantity, products(*)')
      .eq('bundle_id', id);

    if (itemsError) {
      throw itemsError;
    }

    const items = (itemsData || []).map((item: any) => ({
      bundle_id: item.bundle_id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.products as Product,
    }));

    return {
      ...bundleData,
      items,
    } as BundleWithItems;
  }

  /**
   * Crea un nuevo combo y sus relaciones en bundle_items
   */
  async createBundle(
    bundleDto: CreateBundleDto,
    items: CreateBundleItemDto[]
  ): Promise<BundleWithItems> {
    const slug = bundleDto.slug?.trim() ? bundleDto.slug.trim() : slugify(bundleDto.name);

    // 1. Insertar el combo en la tabla 'bundles'
    const { data: bundle, error: bundleError } = await this.supabase
      .from('bundles')
      .insert({
        name: bundleDto.name.trim(),
        slug,
        description: bundleDto.description?.trim() || null,
        total_price: bundleDto.total_price,
        discount_percentage:
          bundleDto.discount_percentage != null ? bundleDto.discount_percentage : null,
        images: bundleDto.images || [],
        valid_from: bundleDto.valid_from || null,
        valid_until: bundleDto.valid_until || null,
        is_active: bundleDto.is_active ?? true,
      })
      .select()
      .single();

    if (bundleError) {
      throw bundleError;
    }

    // 2. Insertar los ítems de la composición en 'bundle_items'
    if (items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        bundle_id: bundle.id,
        product_id: it.product_id,
        quantity: it.quantity,
      }));

      const { error: itemsError } = await this.supabase
        .from('bundle_items')
        .insert(itemsToInsert);

      if (itemsError) {
        throw itemsError;
      }
    }

    return {
      ...bundle,
      items: items.map((it) => ({
        bundle_id: bundle.id,
        product_id: it.product_id,
        quantity: it.quantity,
      })),
    } as BundleWithItems;
  }

  /**
   * Sube una imagen al bucket media en la ruta 'bundles/' y retorna la URL pública
   */
  async uploadBundleImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `bundles/${fileName}`;

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

    // 2. Fallback al bucket alternativo
    const fallbackBucketName = primaryBucketName === 'media' ? 'products' : 'media';
    const fallbackBucket = this.supabase.storage.from(fallbackBucketName);
    const { error: fallbackError } = await fallbackBucket.upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (fallbackError) {
      throw new Error(
        `Error al subir imagen de combo: no se pudo guardar en '${primaryBucketName}/bundles' ni en '${fallbackBucketName}/bundles'.`
      );
    }

    const { data: fallbackData } = fallbackBucket.getPublicUrl(filePath);
    return fallbackData.publicUrl;
  }
}

