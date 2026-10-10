import { inject, Service } from '@angular/core';
import { SupabaseService } from '@ecotanti/shared-auth';
import { Category, CreateCategoryDto } from '../models/catalog.models';
import { slugify } from '../utils/slug';

@Service()
export class CategoriesService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene la lista completa de categorías activas ordenadas por nombre.
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return (data || []) as Category[];
  }

  /**
   * Crea una nueva categoría autogenerando su slug si no fue provisto
   */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug?.trim() ? dto.slug.trim() : slugify(dto.name);
    const { data, error } = await this.supabase
      .from('categories')
      .insert({
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Category;
  }
}

