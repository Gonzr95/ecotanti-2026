import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { ToggleSwitch } from '@openng/optimus-ui/toggleswitch';
import { Dialog } from '@openng/optimus-ui/dialog';
import { Toast } from '@openng/optimus-ui/toast';
import { MessageService } from '@openng/optimus-ui/api';
import { Offer, OfferWithItems, OffersService } from '@ecotanti/shared-catalog';
import { OfferCreateWizardComponent } from './components/offer-create-wizard/offer-create-wizard';

export interface OfferStatusBadge {
  code: 'active' | 'upcoming' | 'expired' | 'paused' | 'indefinite';
  label: string;
  badgeClass: string;
  icon: string;
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputText,
    ToggleSwitch,
    Dialog,
    Toast,
    OfferCreateWizardComponent,
  ],
  providers: [MessageService],
  templateUrl: './offers.html',
})
export class OffersComponent implements OnInit {
  private readonly offersService = inject(OffersService);
  private readonly messageService = inject(MessageService);

  /**
   * Estado de la colección de ofertas
   */
  readonly offers = signal<OfferWithItems[]>([]);
  readonly isLoading = signal<boolean>(false);

  /**
   * Filtros y búsqueda
   */
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'all' | 'active' | 'upcoming' | 'expired' | 'paused'>('all');

  /**
   * Control del asistente (Wizard)
   */
  readonly isWizardVisible = signal<boolean>(false);
  readonly selectedOfferToEdit = signal<OfferWithItems | null>(null);

  /**
   * Estado del diálogo de confirmación de eliminación
   */
  readonly isDeleteDialogOpen = signal<boolean>(false);
  readonly offerToDelete = signal<OfferWithItems | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly hasOrdersWarning = signal<boolean>(false);

  /**
   * Lista filtrada reactiva
   */
  readonly filteredOffers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    return this.offers().filter((offer) => {
      // Filtro de texto
      const matchesSearch =
        !query ||
        offer.name.toLowerCase().includes(query) ||
        (offer.description && offer.description.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filtro de estado
      if (filter === 'all') return true;

      const status = this.getOfferStatus(offer);
      if (filter === 'paused') return !offer.is_active;
      if (filter === 'active') return offer.is_active && (status.code === 'active' || status.code === 'indefinite');
      if (filter === 'upcoming') return offer.is_active && status.code === 'upcoming';
      if (filter === 'expired') return status.code === 'expired';

      return true;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadOffers();
  }

  /**
   * Carga la lista completa de ofertas
   */
  async loadOffers(): Promise<void> {
    try {
      this.isLoading.set(true);
      const data = await this.offersService.getOffers();
      this.offers.set(data);
    } catch (error) {
      console.error('Error al cargar ofertas:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las ofertas del catálogo.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Calcula el badge de estado en tiempo real para una oferta
   */
  getOfferStatus(offer: Offer): OfferStatusBadge {
    if (!offer.is_active) {
      return {
        code: 'paused',
        label: 'Pausada',
        badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
        icon: 'pi pi-pause',
      };
    }

    const now = new Date();

    if (offer.valid_from && offer.valid_until) {
      const from = new Date(offer.valid_from);
      const until = new Date(offer.valid_until);

      if (now > until) {
        return {
          code: 'expired',
          label: 'Vencida',
          badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          icon: 'pi pi-clock',
        };
      }
      if (now >= from && now <= until) {
        return {
          code: 'active',
          label: 'Vigente',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          icon: 'pi pi-check-circle',
        };
      }
      if (now < from) {
        return {
          code: 'upcoming',
          label: 'Próxima',
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          icon: 'pi pi-calendar',
        };
      }
    } else if (offer.valid_from) {
      const from = new Date(offer.valid_from);
      if (now >= from) {
        return {
          code: 'active',
          label: 'Vigente',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          icon: 'pi pi-check-circle',
        };
      } else {
        return {
          code: 'upcoming',
          label: 'Próxima',
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          icon: 'pi pi-calendar',
        };
      }
    }

    if (offer.promotion_starts_at) {
      const start = new Date(offer.promotion_starts_at);
      if (now >= start) {
        return {
          code: 'upcoming',
          label: 'Próxima (Teaser)',
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          icon: 'pi pi-megaphone',
        };
      }
    }

    return {
      code: 'indefinite',
      label: 'Activa (Indefinida)',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      icon: 'pi pi-infinity',
    };
  }

  // ==========================================
  // APERTURA Y CIERRE DEL WIZARD
  // ==========================================

  openCreateWizard(): void {
    this.selectedOfferToEdit.set(null);
    this.isWizardVisible.set(true);
  }

  openEditWizard(offer: OfferWithItems): void {
    this.selectedOfferToEdit.set(offer);
    this.isWizardVisible.set(true);
  }

  onOfferSaved(savedOffer: OfferWithItems): void {
    this.offers.update((prev) => {
      const exists = prev.some((o) => o.id === savedOffer.id);
      if (exists) {
        return prev.map((o) => (o.id === savedOffer.id ? savedOffer : o));
      }
      return [savedOffer, ...prev];
    });
  }

  // ==========================================
  // ACCIONES RÁPIDAS
  // ==========================================

  async toggleOfferStatus(offer: OfferWithItems, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    const nextStatus = !offer.is_active;

    try {
      await this.offersService.toggleOfferStatus(offer.id, nextStatus);
      this.offers.update((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, is_active: nextStatus } : o))
      );
      this.messageService.add({
        severity: nextStatus ? 'success' : 'info',
        summary: nextStatus ? 'Oferta Activada' : 'Oferta Pausada',
        detail: `La oferta "${offer.name}" ahora está ${nextStatus ? 'activa' : 'pausada'}.`,
      });
    } catch (error) {
      console.error('Error al cambiar estado de oferta:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado de la oferta.',
      });
    }
  }

  // ==========================================
  // ELIMINACIÓN PROTEGIDA
  // ==========================================

  askDeleteOffer(offer: OfferWithItems, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.offerToDelete.set(offer);
    this.hasOrdersWarning.set(false);
    this.isDeleteDialogOpen.set(true);
  }

  async executeDelete(): Promise<void> {
    const offer = this.offerToDelete();
    if (!offer) return;

    this.isDeleting.set(true);
    try {
      const result = await this.offersService.deleteOffer(offer.id);

      if (result.hasOrders) {
        this.hasOrdersWarning.set(true);
        this.messageService.add({
          severity: 'warn',
          summary: 'No se puede eliminar',
          detail: 'Esta oferta tiene órdenes registradas en el historial. Recomendamos pausarla.',
        });
        return;
      }

      this.offers.update((prev) => prev.filter((o) => o.id !== offer.id));
      this.messageService.add({
        severity: 'success',
        summary: 'Oferta Eliminada',
        detail: `La oferta "${offer.name}" fue eliminada.`,
      });
      this.closeDeleteDialog();
    } catch (error) {
      console.error('Error al eliminar oferta:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al eliminar la oferta.',
      });
    } finally {
      this.isDeleting.set(false);
    }
  }

  closeDeleteDialog(): void {
    this.isDeleteDialogOpen.set(false);
    this.offerToDelete.set(null);
    this.hasOrdersWarning.set(false);
  }
}

