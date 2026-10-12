import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import {
  CreateOfferDto,
  CreateOfferItemDto,
  OfferWithItems,
  UpdateOfferDto,
} from '../models/offer.models';
import { slugify } from '../utils/slug';

@Service()
export class OffersService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista completa de ofertas junto con sus ítems (productos o combos)
   */
  async getOffers(options?: { activeOnly?: boolean }): Promise<OfferWithItems[]> {
    let query = this.supabase
      .from('offers')
      .select('*, items:offer_items(*, product:products(*), bundle:bundles(*))')
      .order('created_at', { ascending: false });

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []) as OfferWithItems[];
  }

  /**
   * Obtiene una oferta por ID con todos sus ítems vinculados
   */
  async getOfferById(id: number): Promise<OfferWithItems> {
    const { data, error } = await this.supabase
      .from('offers')
      .select('*, items:offer_items(*, product:products(*), bundle:bundles(*))')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data as OfferWithItems;
  }

  /**
   * Crea una nueva oferta cabecera y sus relaciones en offer_items
   */
  async createOffer(
    dto: CreateOfferDto,
    items: CreateOfferItemDto[]
  ): Promise<OfferWithItems> {
    const slug = dto.slug?.trim() ? dto.slug.trim() : slugify(dto.name);

    // 1. Insertar en 'offers'
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .insert({
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        image_url: dto.image_url?.trim() || null,
        logo_url: dto.logo_url?.trim() || null,
        promotion_starts_at: dto.promotion_starts_at || null,
        valid_from: dto.valid_from || null,
        valid_until: dto.valid_until || null,
        discount_percentage:
          dto.discount_percentage != null ? dto.discount_percentage : null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (offerError) {
      throw offerError;
    }

    // 2. Insertar los ítems asociados en 'offer_items'
    if (items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        offer_id: offer.id,
        product_id: it.product_id || null,
        bundle_id: it.bundle_id || null,
        price: it.price != null ? it.price : null,
        is_active: it.is_active ?? true,
      }));

      const { error: itemsError } = await this.supabase
        .from('offer_items')
        .insert(itemsToInsert);

      if (itemsError) {
        throw itemsError;
      }
    }

    return this.getOfferById(offer.id);
  }

  /**
   * Actualiza una oferta existente y sincroniza sus ítems asociados
   */
  async updateOffer(
    id: number,
    dto: UpdateOfferDto,
    items?: CreateOfferItemDto[]
  ): Promise<OfferWithItems> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) {
      updatePayload['name'] = dto.name.trim();
      updatePayload['slug'] = dto.slug?.trim() || slugify(dto.name);
    }
    if (dto.description !== undefined) {
      updatePayload['description'] = dto.description?.trim() || null;
    }
    if (dto.image_url !== undefined) {
      updatePayload['image_url'] = dto.image_url?.trim() || null;
    }
    if (dto.logo_url !== undefined) {
      updatePayload['logo_url'] = dto.logo_url?.trim() || null;
    }
    if (dto.promotion_starts_at !== undefined) {
      updatePayload['promotion_starts_at'] = dto.promotion_starts_at;
    }
    if (dto.valid_from !== undefined) {
      updatePayload['valid_from'] = dto.valid_from;
    }
    if (dto.valid_until !== undefined) {
      updatePayload['valid_until'] = dto.valid_until;
    }
    if (dto.discount_percentage !== undefined) {
      updatePayload['discount_percentage'] = dto.discount_percentage;
    }
    if (dto.is_active !== undefined) {
      updatePayload['is_active'] = dto.is_active;
    }

    // 1. Actualizar la cabecera
    const { error: offerError } = await this.supabase
      .from('offers')
      .update(updatePayload)
      .eq('id', id);

    if (offerError) {
      throw offerError;
    }

    // 2. Si se suministran ítems, reemplazar los anteriores
    if (items !== undefined) {
      const { error: deleteError } = await this.supabase
        .from('offer_items')
        .delete()
        .eq('offer_id', id);

      if (deleteError) {
        throw deleteError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((it) => ({
          offer_id: id,
          product_id: it.product_id || null,
          bundle_id: it.bundle_id || null,
          price: it.price != null ? it.price : null,
          is_active: it.is_active ?? true,
        }));

        const { error: insertError } = await this.supabase
          .from('offer_items')
          .insert(itemsToInsert);

        if (insertError) {
          throw insertError;
        }
      }
    }

    return this.getOfferById(id);
  }

  /**
   * Cambia el estado activo/pausado de una oferta
   */
  async toggleOfferStatus(id: number, isActive: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('offers')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Elimina una oferta y sus offer_items si no existen órdenes históricas vinculadas
   */
  async deleteOffer(id: number): Promise<{ success: boolean; hasOrders?: boolean }> {
    // 1. Verificar si algún ítem de la oferta está registrado en detalles de pedidos
    const { data: offerItems, error: itemsError } = await this.supabase
      .from('offer_items')
      .select('id')
      .eq('offer_id', id);

    if (itemsError) {
      throw itemsError;
    }

    if (offerItems && offerItems.length > 0) {
      const itemIds = offerItems.map((it: any) => it.id);
      const { count, error: countError } = await this.supabase
        .from('order_details')
        .select('id', { count: 'exact', head: true })
        .in('offer_item_id', itemIds);

      if (!countError && count && count > 0) {
        return { success: false, hasOrders: true };
      }
    }

    // 2. Eliminar offer_items primero (para compatibilidad total)
    const { error: deleteItemsError } = await this.supabase
      .from('offer_items')
      .delete()
      .eq('offer_id', id);

    if (deleteItemsError) {
      throw deleteItemsError;
    }

    // 3. Eliminar la oferta
    const { error: deleteOfferError } = await this.supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (deleteOfferError) {
      throw deleteOfferError;
    }

    return { success: true };
  }

  /**
   * Sube una imagen (banner o logo) al bucket media en la ruta 'offers/' y retorna su URL pública
   */
  async uploadOfferImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `offers/${fileName}`;

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
        `Error al subir imagen de oferta: no se pudo guardar en '${primaryBucketName}/offers' ni en '${fallbackBucketName}/offers'.`
      );
    }

    const { data: fallbackData } = fallbackBucket.getPublicUrl(filePath);
    return fallbackData.publicUrl;
  }
}

