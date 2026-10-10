import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '@openng/optimus-ui/button';
import { TableModule } from '@openng/optimus-ui/table';
import { Dialog } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { Skeleton } from '@openng/optimus-ui/skeleton';
import { Tag } from '@openng/optimus-ui/tag';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { Toast } from '@openng/optimus-ui/toast';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { BrandWithProductCount, BrandsService } from '@ecotanti/shared-catalog';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Button,
    TableModule,
    Dialog,
    InputText,
    IconField,
    InputIcon,
    ToggleSwitch,
    Skeleton,
    Tag,
    ConfirmDialog,
    Toast,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './brands.html',
})
export class BrandsComponent implements OnInit {
  private readonly brandsService = inject(BrandsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  // Estados Reactivos con Signals
  readonly brands = signal<BrandWithProductCount[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  readonly isDialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingBrandId = signal<number | null>(null);
  readonly updatingStatusId = signal<number | null>(null);

  // Formulario Reactivo
  readonly brandForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    logo_url: [''],
    is_active: [true],
  });

  // Lista filtrada reactiva en base a searchTerm
  readonly filteredBrands = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.brands();
    if (!term) return list;
    return list.filter((b) => b.name.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.loadBrands();
  }

  async loadBrands(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.brandsService.getBrandsWithProductCount();
      this.brands.set(data);
    } catch (error) {
      console.error('Error al cargar marcas:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las marcas del catálogo.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input?.value ?? '');
  }

  openNewBrandDialog(): void {
    this.isEditMode.set(false);
    this.editingBrandId.set(null);
    this.brandForm.reset({
      name: '',
      logo_url: '',
      is_active: true,
    });
    this.isDialogVisible.set(true);
  }

  openEditBrandDialog(brand: BrandWithProductCount): void {
    this.isEditMode.set(true);
    this.editingBrandId.set(brand.id);
    this.brandForm.patchValue({
      name: brand.name,
      logo_url: brand.logo_url || '',
      is_active: brand.is_active,
    });
    this.isDialogVisible.set(true);
  }

  closeDialog(): void {
    this.isDialogVisible.set(false);
  }

  async saveBrand(): Promise<void> {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    const { name, logo_url, is_active } = this.brandForm.getRawValue();
    if (!name?.trim()) return;

    this.isSaving.set(true);
    try {
      if (this.isEditMode() && this.editingBrandId() !== null) {
        await this.brandsService.updateBrand(this.editingBrandId()!, {
          name: name.trim(),
          logo_url: logo_url?.trim() || null,
          is_active: is_active ?? true,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Marca Actualizada',
          detail: `"${name.trim()}" se guardó correctamente.`,
        });
      } else {
        await this.brandsService.createBrand({
          name: name.trim(),
          slug: '', // Se autogenera transparente en BrandsService
          logo_url: logo_url?.trim() || null,
          is_active: is_active ?? true,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Marca Creada',
          detail: `"${name.trim()}" se agregó al catálogo.`,
        });
      }

      this.isDialogVisible.set(false);
      await this.loadBrands();
    } catch (error: any) {
      console.error('Error al guardar marca:', error);
      const detailMsg = error?.message?.includes('duplicate key')
        ? 'Ya existe una marca con ese nombre o identificador.'
        : 'Ocurrió un error al guardar la marca.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: detailMsg,
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async onToggleActive(brand: BrandWithProductCount, event: any): Promise<void> {
    const newStatus = event.checked;
    this.updatingStatusId.set(brand.id);
    try {
      await this.brandsService.toggleActive(brand.id, newStatus);
      // Actualizar el estado local para reactividad inmediata
      this.brands.update((current) =>
        current.map((b) => (b.id === brand.id ? { ...b, is_active: newStatus } : b))
      );
      this.messageService.add({
        severity: 'info',
        summary: 'Estado Actualizado',
        detail: `Marca "${brand.name}" ${newStatus ? 'activada' : 'desactivada'}.`,
        life: 2500,
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      // Revertir cambio local en caso de fallo
      this.brands.update((current) =>
        current.map((b) => (b.id === brand.id ? { ...b, is_active: !newStatus } : b))
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado de la marca.',
      });
    } finally {
      this.updatingStatusId.set(null);
    }
  }

  confirmDelete(brand: BrandWithProductCount): void {
    const hasProducts = brand.product_count > 0;
    const warningMessage = hasProducts
      ? `Atención: La marca "${brand.name}" tiene ${brand.product_count} producto(s) asociado(s). Si la eliminas, esos productos quedarán huérfanos sin marca asignada. ¿Deseas eliminarla de todas formas?`
      : `¿Estás seguro de que deseas eliminar permanentemente la marca "${brand.name}"?`;

    this.confirmationService.confirm({
      header: 'Confirmar Eliminación',
      message: warningMessage,
      icon: hasProducts ? 'pi pi-exclamation-triangle text-amber-400' : 'pi pi-trash text-rose-400',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: async () => {
        try {
          await this.brandsService.deleteBrand(brand.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Marca Eliminada',
            detail: `"${brand.name}" fue eliminada del sistema.`,
          });
          await this.loadBrands();
        } catch (error) {
          console.error('Error al eliminar marca:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la marca.',
          });
        }
      },
    });
  }
}
