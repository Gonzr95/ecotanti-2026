import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import {
  Brand,
  BrandWithProductCount,
  CreateBrandDto,
  UpdateBrandDto,
} from '../models/catalog.models';
import { slugify } from '../utils/slug';

@Service()
export class BrandsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista completa de marcas con el recuento de productos asociados.
   */
  async getBrandsWithProductCount(): Promise<BrandWithProductCount[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*, products(count)')
      .order('name');

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => {
      let productCount = 0;
      if (Array.isArray(row.products) && row.products.length > 0) {
        productCount = Number(row.products[0].count ?? 0);
      } else if (row.products && typeof row.products.count === 'number') {
        productCount = row.products.count;
      }

      return {
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        name: row.name,
        slug: row.slug,
        logo_url: row.logo_url,
        is_active: row.is_active,
        product_count: productCount,
      };
    });
  }

  /**
   * Crea una nueva marca en el sistema
   */
  async createBrand(dto: CreateBrandDto): Promise<Brand> {
    const slug = dto.slug?.trim() ? dto.slug.trim() : slugify(dto.name);
    const { data, error } = await this.supabase
      .from('brands')
      .insert({
        name: dto.name.trim(),
        slug,
        logo_url: dto.logo_url?.trim() || null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Brand;
  }

  /**
   * Actualiza los datos de una marca existente
   */
  async updateBrand(id: number, dto: UpdateBrandDto): Promise<Brand> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) {
      updatePayload['name'] = dto.name.trim();
      updatePayload['slug'] = dto.slug?.trim() ? dto.slug.trim() : slugify(dto.name);
    }
    if (dto.logo_url !== undefined) {
      updatePayload['logo_url'] = dto.logo_url?.trim() || null;
    }
    if (dto.is_active !== undefined) {
      updatePayload['is_active'] = dto.is_active;
    }

    const { data, error } = await this.supabase
      .from('brands')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Brand;
  }

  /**
   * Modifica directamente el estado activo/inactivo de una marca
   */
  async toggleActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('brands')
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
   * Elimina una marca de la base de datos
   */
  async deleteBrand(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}

