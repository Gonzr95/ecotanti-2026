# Especificación Técnica: Módulo de Ofertas y Campañas Promocionales (`offers` & `offer_items`)

Este documento define la arquitectura, diseño de interfaz (UI/UX mobile-first), flujos de trabajo y servicios para el módulo de **Ofertas y Campañas Promocionales** en el Backoffice de EcoTanti.

---

## 1. Visión General del Módulo

El módulo de Ofertas permite gestionar eventos, campañas y promociones especiales (ej. *CyberWeek*, *Ofertas de Temporada*, *20% en Chocolatería*, *Especial Alfajores*). 
Cada oferta actúa como una **colección promocional** que agrupa uno o varios productos del inventario y/o combos, permitiendo asignar un descuento porcentual de referencia o precios promocionales individuales a cada ítem.

---

## 2. Modelo de Datos y Relaciones

### 2.1. Tabla `offers`
Almacena la cabecera y metadatos de la campaña o promoción.

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | `int8` | PK (Identity) | Identificador único de la oferta. |
| `name` | `text` | NOT NULL | Nombre comercial (ej. "Semana de la Dulzura"). |
| `slug` | `text` | UNIQUE NOT NULL | Identificador URL autogenerado (`slugify(name)`). |
| `description` | `text` | Nullable | Condiciones, términos o descripción detallada. |
| `image_url` | `text` | Nullable | Banner principal apaisado (almacenado en `media/offers`). |
| `logo_url` | `text` | Nullable | Logo, badge o insignia gráfica de campaña (en `media/offers`). |
| `promotion_starts_at` | `timestamptz` | Nullable | Fecha desde la cual se exhibe el anuncio publicitario (Teaser). |
| `valid_from` | `timestamptz` | Nullable | Inicio del período con precios de oferta vigentes. |
| `valid_until` | `timestamptz` | Nullable | Fin del período de vigencia de la oferta. |
| `discount_percentage` | `numeric(5,2)` | Nullable | Porcentaje de descuento global de referencia (ej. 20.00). |
| `is_active` | `boolean` | DEFAULT true | Estado manual de activación / pausa de la campaña. |
| `created_at` | `timestamptz` | DEFAULT now() | Fecha de creación del registro. |
| `updated_at` | `timestamptz` | Nullable | Última modificación. |

### 2.2. Tabla `offer_items`
Almacena los productos o combos asociados a la oferta con su precio de venta promocional.

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | `int8` | PK (Identity) | Identificador único del ítem en oferta. |
| `offer_id` | `int8` | FK `offers(id)` | Referencia a la oferta cabecera (CASCADE delete). |
| `product_id` | `int8` | FK `products(id)` Nullable | Producto regular asociado. |
| `bundle_id` | `int8` | FK `bundles(id)` Nullable | Combo o paquete asociado. |
| `price` | `numeric(12,2)` | Nullable | Precio final de venta en oferta (moneda local). |
| `is_active` | `boolean` | DEFAULT true | Permite pausar un producto específico dentro de la oferta. |

> [!NOTE]
> Cada fila de `offer_items` debe tener **o bien** `product_id` **o bien** `bundle_id` definido (mutuamente excluyentes o discriminados por tipo).

---

## 3. Arquitectura en el Frontend (`projects/backoffice`)

### 3.1. Rutas y Permisos
- **Ruta:** `/ofertas`
- **Módulo:** `projects/backoffice/src/app/features/catalog/offers/`
- **Componentes:**
  - `OffersComponent` (`offers.ts` / `offers.html`): Catálogo principal en vista de tarjetas enriquecidas.
  - `OfferCreateWizardComponent` (`components/offer-create-wizard/`): Asistente modal en 4 pasos para alta y edición.
- **Protección de Ruta:**
  - `canActivate: [permissionGuard]`
  - Permiso de lectura: `catalog.offers.view`
  - Permiso de administración: `catalog.offers.manage`

### 3.2. Biblioteca Compartida (`libs/shared-catalog`)
- **Modelos:** `libs/shared-catalog/src/lib/models/offer.models.ts` (ya existente).
- **Servicio:** `OffersService` (`libs/shared-catalog/src/lib/services/offers.service.ts`):
  - `getOffers(options?: { activeOnly?: boolean }): Promise<OfferWithItems[]>`
  - `getOfferById(id: number): Promise<OfferWithItems>`
  - `createOffer(dto: CreateOfferDto, items: CreateOfferItemDto[]): Promise<OfferWithItems>`
  - `updateOffer(id: number, dto: UpdateOfferDto, items?: CreateOfferItemDto[]): Promise<OfferWithItems>`
  - `deleteOffer(id: number): Promise<void>`
  - `toggleOfferStatus(id: number, isActive: boolean): Promise<void>`
  - `uploadOfferImage(file: File, folder?: 'banners' | 'logos'): Promise<string>`: Carga en bucket `media` ruta `offers/`.

---

## 4. Diseño de la Interfaz de Usuario (UI/UX)

### 4.1. Pantalla Principal: `/ofertas`
- **Encabezado:**
  - Título con ícono `%` y subtítulo explicativo.
  - Botón principal: `<p-button label="Nueva Oferta" icon="pi pi-plus" (onClick)="openCreateWizard()" />`.
- **Barra de Herramientas y Filtros:**
  - Buscador predictivo por nombre de campaña.
  - Filtros rápidos por estado: `Todas`, `Vigentes`, `Próximas`, `Vencidas`, `Pausadas`.
- **Visualización: Cuadrícula de Tarjetas Promocionales (Cards Responsive):**
  Cada tarjeta de oferta presenta:
  1. **Portada visual:** Banner (`image_url`) con relación de aspecto 16:9 y logo de campaña (`logo_url`) superpuesto en miniatura circular/cuadrada.
  2. **Badges de estado en tiempo real:**
     - `Vigente` (Verde esmeralda): Si está activa y la fecha actual está entre `valid_from` y `valid_until`.
     - `Próxima (Teaser)` (Azul cian): Si `promotion_starts_at` ya inició pero `valid_from` aún no llegó.
     - `Vencida` (Gris pizarra): Si `valid_until` ya expiró.
     - `Pausada` (Ámbar): Si `is_active === false`.
     - `Sin Fechas` (Índigo): Si la vigencia es indefinida.
  3. **Información clave:**
     - Nombre y descripción resumida.
     - Porcentaje de referencia (`20% OFF`).
     - Cantidad de productos y combos vinculados (`5 productos en oferta`).
     - Rango de fechas legible (`15/10/26 00:00 - 20/10/26 23:59`).
  4. **Acciones directas:**
     - Switch `<p-toggleswitch>` para activación/pausa instantánea.
     - Botón `Editar`: Abre el Wizard en modo edición precargado.
     - Menú contextual: `Ver en Tienda`, `Duplicar`, `Eliminar`.

---

### 4.2. Asistente de Creación y Edición (`OfferCreateWizardComponent`)
Modal con `p-dialog`, barra de progreso superior y 4 etapas secuenciales:

```mermaid
flowchart LR
    Paso1["Paso 1: Información & Banner"] --> Paso2["Paso 2: Vigencia & Teaser"]
    Paso2 --> Paso3["Paso 3: Productos & Precios"]
    Paso3 --> Paso4["Paso 4: Resumen & Confirmación"]
```

#### Paso 1: Información Básica e Identidad Visual
- **Nombre de la Oferta:** Obligatorio (mínimo 3 caracteres). El slug se genera automáticamente al guardar.
- **Descripción Opcional:** Términos o condiciones para los clientes.
- **Porcentaje de Descuento General (Opcional):** Input numérico `%` para autocalcular los precios de oferta en el Paso 3.
- **Banner Principal (`image_url`):**
  - Botón para cargar archivo directo al bucket `media/offers/` o ingresar URL externa.
  - Previsualización en miniatura con opción de eliminar o reemplazar.
- **Logo / Insignia Opcional (`logo_url`):**
  - Carga de ícono o sticker de campaña (badge gráfico) al bucket `media/offers/` o URL externa.
- **Switch de Estado:** Activo / Inactivo (por defecto Activo).

#### Paso 2: Vigencia y Difusión Anticipada (Opcional)
- **Período de Vigencia de Precios:**
  - Componente único `p-datepicker` con `selectionMode="range"`, selector de hora (24h), `[showClear]="true"` y `dateFormat="dd/mm/yy"`.
  - Si se deja vacío, la oferta no tiene fecha de caducidad automática (vigencia indefinida mientras esté Activa).
- **Anuncio Anticipado / Teaser (`promotion_starts_at`):**
  - Switch opcional: *“¿Anunciar campaña con anticipación antes de que arranquen las compras?”*
  - Si se activa, muestra un selector `p-datepicker` individual para indicar cuándo comenzará a verse el banner publicitario.

#### Paso 3: Selección de Productos/Combos y Precios de Oferta (Mobile-First)
Diseñado específicamente para operar cómodamente tanto en computadoras de escritorio como en smartphones:

1. **Buscador y Agregado Rápido:**
   - Selector `<p-select>` con búsqueda y tabs o filtros para alternar entre **Productos** y **Combos**.
   - Muestra foto miniatura, nombre y precio de lista regular.
   - Botón *“Agregar a la oferta”*.
2. **Acción Masiva de Campaña:**
   - Botón: *“Aplicar [X]% de la campaña a todos”*.
   - Al presionarlo, recalcula automáticamente el `price` de cada ítem de la lista según su precio regular menos el descuento general.
3. **Lista de Ítems en Tarjetas Compactas Adaptativas:**
   Cada ítem seleccionado se muestra como una tarjeta individual limpia:
   - **Miniatura + Nombre del Producto/Combo:** Etiqueta distintiva `Producto` o `Combo`.
   - **Precio Regular:** Mostrado tachado o como referencia (ej. `$5.000,00`).
   - **Input de Precio de Oferta:** Campo numérico donde el operador puede ingresar directamente el precio promocional (ej. `$4.000,00`).
   - **Badge de Ahorro en tiempo real:** Muestra el cálculo dinámico (`-20% OFF | Ahorro $1.000,00`).
   - **Controles de Ítem:** Toggle para pausar/activar individualmente el ítem y botón de tacho de basura para removerlo.

#### Paso 4: Resumen y Confirmación Final
- Resumen consolidado:
  - Vista previa del banner y logo.
  - Período de vigencia y fecha teaser (o indicación de *Indefinido*).
  - Cantidad total de productos y combos en oferta.
  - Descuento promedio y ahorro estimado para los clientes.
- Botón final: *“Crear Oferta”* (o *“Guardar Cambios”* en modo edición).

---

## 5. Estrategia de Bajas y Desactivación

1. **Pausado Inmediato:** Mediante el switch `is_active` en la card principal o en el wizard, sin alterar la configuración de los productos.
2. **Eliminación Protegida:**
   - Al pulsar *Eliminar*, el sistema verifica si algún ítem de la oferta está referenciado en `order_details.offer_item_id`.
   - Si **no tiene ventas asociadas**: se realiza el borrado físico (`DELETE FROM offers WHERE id = ...`) con eliminación en cascada de `offer_items`.
   - Si **tiene órdenes históricas registradas**: se previene el borrado para mantener la integridad contable y de auditoría, mostrando un diálogo que ofrece desactivarla/pausarla (`is_active = false`).

---

## 6. Checklist de Implementación

- [ ] **Fase 1: Servicio en `shared-catalog`**
  - Implementar `OffersService` con métodos CRUD, gestión de `offer_items` y subida a Supabase Storage (`media/offers`).
  - Exportar `OffersService` en `libs/shared-catalog/src/index.ts`.
- [ ] **Fase 2: Componente Asistente (`OfferCreateWizardComponent`)**
  - Crear componente standalone en `features/catalog/offers/components/offer-create-wizard/`.
  - Implementar lógica reactiva por pasos (1 a 4), autogeneración de slug y `dateRange`.
  - Integrar selector responsivo de productos/combos con tarjetas compactas y ajuste porcentual masivo.
- [ ] **Fase 3: Pantalla Principal (`OffersComponent`)**
  - Crear componente en `features/catalog/offers/offers.ts` y `offers.html`.
  - Implementar visualización en cuadrícula de tarjetas con cálculo de badges temporales en tiempo real.
  - Conectar filtros, búsqueda y switches de activación inmediata.
- [ ] **Fase 4: Rutas y Navegación**
  - Registrar la ruta `/ofertas` en `app.routes.ts` protegida con `staffGuard` y `permissionGuard` (`catalog.offers.view`).
  - Verificar visibilidad en el menú lateral `drawer.html`.
- [ ] **Fase 5: Pruebas y Validación**
  - Pruebas unitarias completas con Vitest para `OffersService`, `OffersComponent` y `OfferCreateWizardComponent`.
  - Verificación de compilación de producción con `nx build backoffice`.

