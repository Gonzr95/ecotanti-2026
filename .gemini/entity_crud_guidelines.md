# Guía Estándar de Implementación End-to-End para Entidades ABM / CRUD
> **Stack Tecnológico:** Angular 19/20+ (Signals & Standalone), Optimus UI (OpenNG / PrimeNG fork), Tailwind CSS, Supabase (PostgreSQL + RLS), Vitest.

Este documento establece el estándar de arquitectura, diseño y desarrollo para implementar nuevas entidades y catálogos en el Backoffice del proyecto. Cada entidad debe seguir rigurosamente estas 6 fases de trabajo para garantizar consistencia, seguridad, rendimiento y facilidad de mantenimiento.

---

## Índice de Fases

1. [Scripts de Base de Datos y Políticas RLS (Supabase)](#1-scripts-de-base-de-datos-y-políticas-rls-supabase)
2. [Modelos Fuertemente Tipados (DTOs Explícitos)](#2-modelos-fuertemente-tipados-dtos-explícitos)
3. [Servicio Reactivo con Signals](#3-servicio-reactivo-con-signals)
4. [Componente UI y Experiencia de Usuario (Optimus UI + Tailwind)](#4-componente-ui-y-experiencia-de-usuario-optimus-ui--tailwind)
5. [Rutas, Metadatos y Navegación Dinámica](#5-rutas-metadatos-y-navegación-dinámica)
6. [Verificación, Pruebas Unitarias y Calidad](#6-verificación-pruebas-unitarias-y-calidad)

---

## 1. Scripts de Base de Datos y Políticas RLS (Supabase)

Toda tabla administrada desde el Backoffice debe contar con **Row Level Security (RLS)** activado para proteger la integridad de los datos.

### Reglas de Seguridad
- **Lectura (SELECT):** Acceso público (`USING (true)`). Tanto los clientes de la cartelera web como los empleados del backoffice necesitan consultar los catálogos.
- **Escritura (INSERT, UPDATE, DELETE):** Restringido exclusivamente a usuarios autenticados con rol de empleado (`userType = 'employee'`) verificado en la tabla `public.users`.

### Plantilla SQL de Migración (`supabase/migrations/<entidad>_rls_policies.sql`)

```sql
-- ==============================================================================
-- Políticas de Seguridad a Nivel de Fila (RLS) para la tabla '<nombre_tabla>'
-- Base de Datos: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE public.<nombre_tabla> ENABLE ROW LEVEL SECURITY;

-- 2. Política de LECTURA (SELECT): Acceso público
DROP POLICY IF EXISTS "<nombre_tabla>_select_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_select_policy"
ON public.<nombre_tabla>
FOR SELECT
USING (true);

-- 3. Política de INSERCIÓN (INSERT): Solo Empleados
DROP POLICY IF EXISTS "<nombre_tabla>_insert_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_insert_policy"
ON public.<nombre_tabla>
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);

-- 4. Política de ACTUALIZACIÓN (UPDATE): Solo Empleados
DROP POLICY IF EXISTS "<nombre_tabla>_update_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_update_policy"
ON public.<nombre_tabla>
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);

-- 5. Política de ELIMINACIÓN (DELETE): Solo Empleados
DROP POLICY IF EXISTS "<nombre_tabla>_delete_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_delete_policy"
ON public.<nombre_tabla>
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);
```

### Convenciones de Auditoría en Tablas
- Campos obligatorios de auditoría:
  - `created_at`: `timestamptz DEFAULT now()`
  - `modified_at`: `timestamp NULL`
  - `modifiedBy_userId`: `uuid NULL` (referencia a usuario responsable)
- Si la tabla requiere nombres únicos (ej: géneros, formatos, tipos de asiento), agregar constraint:
  ```sql
  ALTER TABLE public.<nombre_tabla> ADD CONSTRAINT <nombre_tabla>_name_key UNIQUE (name);
  ```

---

## 2. Modelos Fuertemente Tipados (DTOs Explícitos)

> [!IMPORTANT]
> **REGLA ESTRICTA DE TIPADO:** Está terminantemente prohibido utilizar utilidades como `Omit<T, ...>` o `Partial<CreateDTO>` para definir contratos de creación o edición. Cada DTO debe ser un contrato explícito e independiente.

### Ubicación: `src/app/core/models/<entidad>.ts`

Para cada entidad se deben declarar exactamente 4 tipos de datos:

1. **`Entity` (Modelo canónico completo):** Refleja exactamente las columnas de Supabase más los campos computados/resueltos (como `modifiedByName`).
2. **`Create<Entity>Payload`:** Contrato con los campos requeridos para un `INSERT`.
3. **`Update<Entity>Payload`:** Contrato con los campos admitidos para un `UPDATE`.
4. **`<Entity>FormData`:** Contrato para el binding de formularios / inputs en la interfaz de usuario.

### Plantilla de Código TypeScript

```typescript
/**
 * Modelo canónico de la tabla '<entidad>' en Supabase.
 */
export interface MyEntity {
  id: number;
  name: string;
  slug: string | null;
  created_at: string;
  modified_at: string | null;
  modifiedBy_userId: string | null;
  modifiedByName?: string | null; // Resuelto reactivamente en frontend
}

/**
 * Payload específico para la creación de un nuevo registro.
 */
export interface CreateMyEntityPayload {
  name: string;
  slug: string | null;
  modifiedBy_userId: string | null;
}

/**
 * Payload específico para la actualización de un registro existente.
 */
export interface UpdateMyEntityPayload {
  name: string;
  slug: string | null;
  modified_at: string;
  modifiedBy_userId: string | null;
}

/**
 * Modelo para captura de datos en interfaz / formulario.
 */
export interface MyEntityFormData {
  name: string;
  slug?: string;
}
```

---

## 3. Servicio Reactivo con Signals

### Ubicación: `src/app/features/backoffice/services/<entidad>.ts`

Los servicios encapsulan toda la comunicación con Supabase y exponen su estado mediante **Angular Signals**.

### Requerimientos Funcionales
1. **Inyección moderna:** Uso de `inject(...)`.
2. **Estado reactivo expuesto:**
   - `readonly items = signal<MyEntity[]>([]);`
   - `readonly loading = signal<boolean>(false);`
   - `readonly error = signal<string | null>(null);`
3. **Generador de Slugs:** Sanitización de caracteres acentuados con `normalize('NFD')` y reemplazo de símbolos no alfanuméricos por guiones.
4. **Resolución de Nombres de Auditoría (`modifiedByName`):**
   - Extrae los `modifiedBy_userId` únicos.
   - Consulta los nombres en lote contra `public.users` (`firstName`, `lastName`).
   - Resuelve el usuario en sesión actual como fallback si coincide el ID.
   - Si no hay usuario asociado, asigna `'Sistema'` o un identificador truncado.
5. **Actualización inmutable de señales:** Los métodos `create`, `update` y `delete` actualizan la señal local (`items.update(...)`) sin obligar a un refetch completo si la operación fue exitosa.

### Plantilla de Servicio Reactivo

```typescript
import { inject, Injectable, signal } from '@angular/core';
import { Supabase } from '../../../core/services/supabase/supabase';
import { Auth } from '../../auth/services/auth';
import {
  MyEntity,
  CreateMyEntityPayload,
  UpdateMyEntityPayload,
} from '../../../core/models/<entidad>';

@Injectable({
  providedIn: 'root',
})
export class MyEntityService {
  private readonly supabase = inject(Supabase);
  private readonly authService = inject(Auth, { optional: true });

  readonly items = signal<MyEntity[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /**
   * Genera un slug normalizado y sanitizado.
   */
  generateSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Obtiene el nombre del usuario autenticado en sesión.
   */
  private getCurrentUserName(): string {
    const context = typeof this.authService?.currentUserContext === 'function'
      ? this.authService.currentUserContext()
      : null;
    if (context?.profile) {
      const name = [context.profile.firstName, context.profile.lastName].filter(Boolean).join(' ').trim();
      if (name) return name;
    }
    const currentUser = typeof this.authService?.currentUser === 'function'
      ? this.authService.currentUser()
      : null;
    return currentUser?.email || 'Usuario';
  }

  /**
   * Carga todos los registros y enriquece los nombres de usuario de auditoría.
   */
  async loadAll(): Promise<MyEntity[]> {
    this.loading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase
      .from('<nombre_tabla>')
      .select('*')
      .order('name', { ascending: true });

    this.loading.set(false);

    if (error) {
      console.error('Error al cargar datos:', error);
      this.error.set(error.message);
      return [];
    }

    const list = (data as MyEntity[]) ?? [];
    const userIds = Array.from(
      new Set(list.map((item) => item.modifiedBy_userId).filter((id): id is string => !!id))
    );

    const usersMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: usersData } = await this.supabase
        .from('users')
        .select('id, firstName, lastName')
        .in('id', userIds);

      if (usersData) {
        for (const u of usersData) {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          usersMap.set(u.id, fullName || 'Usuario');
        }
      }
    }

    const currentUserId = this.authService?.currentUser()?.id;
    const currentUserName = this.getCurrentUserName();

    const enrichedList: MyEntity[] = list.map((item) => {
      let userName = item.modifiedBy_userId ? usersMap.get(item.modifiedBy_userId) : null;
      if (!userName && item.modifiedBy_userId && item.modifiedBy_userId === currentUserId) {
        userName = currentUserName;
      }
      return {
        ...item,
        modifiedByName: userName || (item.modifiedBy_userId ? `ID: ${item.modifiedBy_userId.slice(0, 8)}` : 'Sistema'),
      };
    });

    this.items.set(enrichedList);
    return enrichedList;
  }

  /**
   * Crea un nuevo registro.
   */
  async create(payload: CreateMyEntityPayload): Promise<{ data: MyEntity | null; error: any }> {
    this.loading.set(true);
    this.error.set(null);

    const currentUserId = this.authService?.currentUser()?.id ?? null;
    const finalPayload: CreateMyEntityPayload = {
      name: payload.name.trim(),
      slug: payload.slug?.trim() || this.generateSlug(payload.name),
      modifiedBy_userId: payload.modifiedBy_userId ?? currentUserId,
    };

    const { data, error } = await this.supabase
      .from('<nombre_tabla>')
      .insert(finalPayload)
      .select('*')
      .single();

    this.loading.set(false);

    if (error) {
      console.error('Error al crear:', error);
      this.error.set(error.message);
      return { data: null, error };
    }

    const created: MyEntity = {
      ...(data as MyEntity),
      modifiedByName: this.getCurrentUserName(),
    };
    this.items.update((curr) => [...curr, created]);
    return { data: created, error: null };
  }

  /**
   * Actualiza un registro existente.
   */
  async update(id: number, payload: UpdateMyEntityPayload): Promise<{ data: MyEntity | null; error: any }> {
    this.loading.set(true);
    this.error.set(null);

    const currentUserId = this.authService?.currentUser()?.id ?? null;
    const finalPayload: UpdateMyEntityPayload = {
      name: payload.name.trim(),
      slug: payload.slug?.trim() || this.generateSlug(payload.name),
      modified_at: payload.modified_at || new Date().toISOString(),
      modifiedBy_userId: payload.modifiedBy_userId ?? currentUserId,
    };

    const { data, error } = await this.supabase
      .from('<nombre_tabla>')
      .update(finalPayload)
      .eq('id', id)
      .select('*')
      .single();

    this.loading.set(false);

    if (error) {
      console.error(`Error al actualizar id ${id}:`, error);
      this.error.set(error.message);
      return { data: null, error };
    }

    const updated: MyEntity = {
      ...(data as MyEntity),
      modifiedByName: this.getCurrentUserName(),
    };
    this.items.update((curr) =>
      curr.map((item) => (item.id === id ? updated : item))
    );
    return { data: updated, error: null };
  }

  /**
   * Elimina un registro por ID.
   */
  async delete(id: number): Promise<{ success: boolean; error: any }> {
    this.loading.set(true);
    this.error.set(null);

    const { error } = await this.supabase
      .from('<nombre_tabla>')
      .delete()
      .eq('id', id);

    this.loading.set(false);

    if (error) {
      console.error(`Error al eliminar id ${id}:`, error);
      this.error.set(error.message);
      return { success: false, error };
    }

    this.items.update((curr) => curr.filter((item) => item.id !== id));
    return { success: true, error: null };
  }
}
```

---

## 4. Componente UI y Experiencia de Usuario (Optimus UI + Tailwind)

### Reglas Clave de Importación en Optimus UI
En Optimus UI (`@openng/optimus-ui`), ciertos componentes complejos poseen la propiedad interna `standalone: false`.
- **Componentes que DEBEN importarse como NgModules:**
  - `TableModule` desde `@openng/optimus-ui/table`
  - `ToastModule` desde `@openng/optimus-ui/toast`
  - `ConfirmDialogModule` desde `@openng/optimus-ui/confirmdialog`
  - `DialogModule` desde `@openng/optimus-ui/dialog`
  - `InputNumberModule` desde `@openng/optimus-ui/inputnumber`
- **Componentes Standalone (importación directa):**
  - `Button` desde `@openng/optimus-ui/button`
  - `InputText` desde `@openng/optimus-ui/inputtext`
  - `IconField` desde `@openng/optimus-ui/iconfield`
  - `InputIcon` desde `@openng/optimus-ui/inputicon`

### Providers Locales
El componente que aloje `<p-toast>` y `<p-confirmdialog>` debe proveer sus servicios correspondientes en el decorador:
```typescript
@Component({
  ...
  providers: [MessageService, ConfirmationService],
})
```

### Elección del Patrón UX según la Complejidad

| Caso de Uso | Patrón Recomendado | Ejemplo en el Proyecto |
|---|---|---|
| **Pocos campos** (Nombre, descripción breve, slug) | **Patrón Inline:** Quick-Add en barra superior + Edición en fila de tabla con teclas `Enter` / `Esc`. | Formatos, Géneros |
| **Múltiples campos** (Precio, coordenadas, estados, relaciones) | **Patrón Modal:** Diálogo emergente con validaciones reactivas y confirmación de creación consecutiva ("¿Desea agregar otro?"). | Tipos de Asientos |

### Corrección Global del Glitch de Animaciones en Modales / Drawers
Para evitar que los Drawers o Diálogos reaparezcan por un milisegundo durante el desmontaje de Angular, asegurar en `src/styles.css`:
```css
.p-drawer-leave-left,
.p-drawer-leave-right,
.p-drawer-leave-top,
.p-drawer-leave-bottom,
.p-drawer-leave-full,
.p-dialog-leave-active,
.p-overlay-mask-leave-active {
  animation-fill-mode: forwards !important;
}
```

### Plantilla de Componente Inline (TypeScript)

```typescript
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from '@openng/optimus-ui/table';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { ToastModule } from '@openng/optimus-ui/toast';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { MyEntity, CreateMyEntityPayload, UpdateMyEntityPayload } from '../../../../core/models/<entidad>';
import { MyEntityService } from '../../services/<entidad>';

@Component({
  selector: 'app-my-entity',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    Button,
    InputText,
    IconField,
    InputIcon,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './my-entity.html',
  standalone: true,
})
export class MyEntityView implements OnInit {
  readonly service = inject(MyEntityService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly items = this.service.items;
  readonly loading = this.service.loading;
  readonly filterText = signal<string>('');

  // Quick-Add
  readonly quickAddName = signal<string>('');
  readonly isCreating = signal<boolean>(false);

  // Edición Inline
  readonly editingId = signal<number | null>(null);
  readonly editingName = signal<string>('');
  readonly isUpdating = signal<boolean>(false);

  // Filtro Reactivo Computado
  readonly filteredItems = computed(() => {
    const query = this.filterText().toLowerCase().trim();
    const list = this.items();
    if (!query) return list;

    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.slug && item.slug.toLowerCase().includes(query)) ||
        (item.modifiedByName && item.modifiedByName.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.service.loadAll();
  }

  async onQuickAdd(): Promise<void> {
    const name = this.quickAddName().trim();
    if (!name || name.length < 2) {
      this.messageService.add({ severity: 'warn', summary: 'Nombre inválido', detail: 'Mínimo 2 caracteres' });
      return;
    }

    if (this.items().some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      this.messageService.add({ severity: 'warn', summary: 'Duplicado', detail: `Ya existe "${name}"` });
      return;
    }

    this.isCreating.set(true);
    const { data, error } = await this.service.create({
      name,
      slug: this.service.generateSlug(name),
      modifiedBy_userId: null,
    });
    this.isCreating.set(false);

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } else if (data) {
      this.messageService.add({ severity: 'success', summary: 'Creado', detail: `"${data.name}" agregado con éxito` });
      this.quickAddName.set('');
    }
  }

  startInlineEdit(item: MyEntity): void {
    this.editingId.set(item.id);
    this.editingName.set(item.name);
  }

  cancelInlineEdit(): void {
    this.editingId.set(null);
    this.editingName.set('');
  }

  async saveInlineEdit(item: MyEntity): Promise<void> {
    const newName = this.editingName().trim();
    if (!newName || newName.toLowerCase() === item.name.toLowerCase()) {
      this.cancelInlineEdit();
      return;
    }

    this.isUpdating.set(true);
    const { data, error } = await this.service.update(item.id, {
      name: newName,
      slug: this.service.generateSlug(newName),
      modified_at: new Date().toISOString(),
      modifiedBy_userId: null,
    });
    this.isUpdating.set(false);

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } else if (data) {
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `Modificado a "${data.name}"` });
      this.cancelInlineEdit();
    }
  }

  confirmDelete(item: MyEntity): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar "${item.name}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { success, error } = await this.service.delete(item.id);
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado correctamente' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message });
        }
      },
    });
  }

  onFilterChange(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
```

---

## 5. Rutas, Metadatos y Navegación Dinámica

### Metadatos `data: { title: '...' }` en el Router
En Angular, la propiedad `data` en la definición de rutas permite adjuntar metadatos estáticos desacoplados de los parámetros de consulta. En el Backoffice, `BackofficeLayout` escucha las navegaciones y actualiza reactivamente el título central del Header mediante el servicio `BackofficeTitle`.

### Registro en `src/app/features/backoffice/backoffice.routes.ts`:
```typescript
{
  path: '<ruta-amigable>',
  title: 'Catálogo de <Entidad>',
  data: { title: 'ABM <Entidad>' },
  loadComponent: () => import('./views/<entidad>/<entidad>').then((m) => m.<Entidad>View),
}
```

### Sincronización en el Drawer Lateral (`drawer.html`):
Agregar el acceso de navegación con icono alusivo de PrimeIcons (`pi-*`):
```html
<a
  routerLink="/backoffice/<ruta-amigable>"
  routerLinkActive="bg-primary-50 text-primary dark:bg-primary-950 font-semibold"
  (click)="closeDrawer()"
  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-sm"
>
  <i class="pi pi-<icono> text-lg"></i>
  <span><Entidad Plural></span>
</a>
```

---

## 6. Verificación, Pruebas Unitarias y Calidad

Toda nueva entidad debe incluir su suite de pruebas unitarias (`.spec.ts`) ejecutada con Vitest y pasar la compilación de producción con cero errores.

### Reglas Clave para Pruebas Unitarias con Optimus UI
1. **Mocking del Servicio Reactivo:** Simular los métodos asíncronos y exponer señales reactivas simuladas (`signal([])`, `signal(false)`).
2. **OverrideComponent y Servicios:** Debido a que el componente declara `providers: [MessageService, ConfirmationService]`, en el test se debe usar `.overrideComponent()` para suministrar el mock del servicio de la entidad conservando `ConfirmationService` y `MessageService` reales.
3. **Manejo de ConfirmationService:** Se deben espiar (`vi.spyOn(service, 'confirm')`) instancias reales obtenidas del inyector para evitar roturas en el constructor de `<p-confirmdialog>`.

### Suite de Pruebas Tipo (`my-entity.spec.ts`)

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MyEntityView } from './my-entity';
import { MyEntityService } from '../../services/<entidad>';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { MyEntity } from '../../../../core/models/<entidad>';

describe('MyEntity View', () => {
  let component: MyEntityView;
  let fixture: ComponentFixture<MyEntityView>;
  let mockService: any;
  let mockConfirmationService: ConfirmationService;
  let mockMessageService: MessageService;

  const sampleItems: MyEntity[] = [
    {
      id: 1,
      name: 'Elemento A',
      slug: 'elemento-a',
      created_at: '2026-09-18T10:00:00Z',
      modified_at: null,
      modifiedBy_userId: null,
      modifiedByName: 'Administrador',
    },
    {
      id: 2,
      name: 'Elemento B',
      slug: 'elemento-b',
      created_at: '2026-09-18T10:00:00Z',
      modified_at: null,
      modifiedBy_userId: null,
      modifiedByName: 'Empleado',
    },
  ];

  beforeEach(async () => {
    mockService = {
      items: signal(sampleItems),
      loading: signal(false),
      generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
      loadAll: vi.fn(),
      create: vi.fn().mockResolvedValue({
        data: { id: 3, name: 'Elemento C', slug: 'elemento-c', created_at: '', modified_at: null, modifiedBy_userId: null },
        error: null,
      }),
      update: vi.fn().mockResolvedValue({
        data: { id: 1, name: 'Elemento A Modificado', slug: 'elemento-a-modificado', created_at: '', modified_at: '', modifiedBy_userId: null },
        error: null,
      }),
      delete: vi.fn().mockResolvedValue({ success: true, error: null }),
    };

    await TestBed.configureTestingModule({
      imports: [MyEntityView],
    })
      .overrideComponent(MyEntityView, {
        set: {
          providers: [
            { provide: MyEntityService, useValue: mockService },
            ConfirmationService,
            MessageService,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MyEntityView);
    component = fixture.componentInstance;
    mockConfirmationService = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(mockConfirmationService, 'confirm');
    mockMessageService = fixture.debugElement.injector.get(MessageService);
    vi.spyOn(mockMessageService, 'add');
    await fixture.whenStable();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los datos al inicializar', () => {
    expect(mockService.loadAll).toHaveBeenCalled();
  });

  it('debe filtrar reactivamente por nombre o autor', () => {
    expect(component.filteredItems().length).toBe(2);
    component.onFilterChange({ target: { value: 'Elemento B' } } as unknown as Event);
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].name).toBe('Elemento B');
  });

  it('debe agregar un nuevo registro desde la barra rápida', async () => {
    component.quickAddName.set('Elemento C');
    await component.onQuickAdd();

    expect(mockService.create).toHaveBeenCalledWith({
      name: 'Elemento C',
      slug: 'elemento-c',
      modifiedBy_userId: null,
    });
    expect(component.quickAddName()).toBe('');
    expect(mockMessageService.add).toHaveBeenCalled();
  });

  it('debe iniciar y cancelar la edición en línea', () => {
    const item = sampleItems[0];
    component.startInlineEdit(item);
    expect(component.editingId()).toBe(item.id);
    expect(component.editingName()).toBe(item.name);

    component.cancelInlineEdit();
    expect(component.editingId()).toBeNull();
  });

  it('debe solicitar confirmación antes de eliminar', () => {
    component.confirmDelete(sampleItems[0]);
    expect(mockConfirmationService.confirm).toHaveBeenCalled();
  });
});
```

### Comandos de Verificación
Ejecutar siempre desde la terminal de Windows con `cmd /c`:

```bash
# 1. Ejecución de pruebas unitarias (Vitest en Angular CLI)
cmd /c "npm test -- --watch=false"

# 2. Compilación de producción (cero advertencias o errores de tipado)
cmd /c "npm run build"
```

---

## Resumen del Checklist para Nuevas Entidades

- [ ] **1. Supabase SQL:** Archivo en `supabase/migrations/<entidad>_rls_policies.sql` con SELECT público y INSERT/UPDATE/DELETE solo para empleados.
- [ ] **2. Modelos:** `src/app/core/models/<entidad>.ts` con interfaces explícitas `Entity`, `CreatePayload`, `UpdatePayload`, `FormData` (sin `Omit` ni `Partial`).
- [ ] **3. Servicio:** `src/app/features/backoffice/services/<entidad>.ts` con `signals`, `loadAll`, `create`, `update`, `delete`, resolución de usuarios y slugifier.
- [ ] **4. Componente UI:** `src/app/features/backoffice/views/<entidad>/` con Optimus UI + Tailwind, Quick-Add + Inline o Modal, `p-toast` y `p-confirmdialog`.
- [ ] **5. Rutas:** Configuración en `backoffice.routes.ts` con `data: { title: '...' }` y enlace en el Drawer.
- [ ] **6. Calidad:** Pruebas unitarias en `.spec.ts` con Vitest y compilación `npm run build` limpia.
