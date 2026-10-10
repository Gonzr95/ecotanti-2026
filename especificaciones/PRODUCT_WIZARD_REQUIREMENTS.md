# Especificación de Requisitos: Componente y Wizard de Productos (Backoffice)

Este documento define en detalle los requisitos funcionales, de diseño y arquitectura para el componente de **Productos** y su **Modal Wizard (Stepper)** de creación por etapas en el Backoffice de **EcoTanti**, alineado con las decisiones consensuadas mediante `/grill-me`.

---

## 1. Visión General y Alcance de la Tarea

* **Componente Contenedor (`ProductsComponent`):**
  * Pantalla inicial accesible bajo el permiso explícito `catalog.products.view` en la ruta `/productos`.
  * Barra superior con título, icono (`pi-box`) y botón principal **"Nuevo Producto"** (idéntico en diseño y tokens al botón de *"Nueva Marca"*).
  * No sobrecargar el HTML principal de productos: la lógica y plantilla del wizard se encapsulan en un componente modal dedicado (`ProductCreateWizardComponent`).
* **Modal Dedicado con Wizard / Stepper:**
  * Diálogo modal (`p-dialog`) centrado, responsive y con desenfoque de fondo.
  * Incorpora una **barra de progreso** y texto informativo con el número de etapa actual (`"Paso X de 5: <Nombre del Paso>"`).
  * **Navegación:**
    * Botón *"Siguiente"*: Valida estrictamente los campos obligatorios de la etapa actual antes de permitir el avance.
    * Botón *"Atrás"*: Permite retroceder libremente en cualquier momento sin perder datos ya ingresados.

---

## 2. Definición Detallada de los 5 Pasos del Wizard

### Paso 1: Información Básica (Nombre y Marca)
* **Nombre del Producto:** Campo de texto obligatorio (mínimo 2 caracteres).
* **Marca:** Dropdown/Select obligatorio que consulta las marcas activas desde `BrandsService`. Si no hay marca seleccionada, no se permite avanzar.
* **Descripción:** Área de texto (`Textarea`) opcional para características y detalles del producto.
* **Slug:** Autogenerado en segundo plano de forma 100% transparente a partir del nombre utilizando la utilidad `slugify()` (sin campo visible en el formulario).

### Paso 2: Precios, Costos y Rentabilidad
* **Precio Base (`base_price`):** Input numérico obligatorio, valor mayor a 0 (precio de venta regular al público).
* **Costo (`cost_price`):** Input numérico estrictamente obligatorio, valor mayor a 0 (costo de adquisición/reposición para el cálculo de rentabilidad).
* **Precio de Oferta (`sale_price`):** Input numérico opcional (si se ingresa, se valida que sea estrictamente menor al precio base).
* **Tarjeta de Rentabilidad en Tiempo Real:**
  * Componente visual reactivo que calcula y muestra al instante:
    * **Ganancia bruta estimada:** `$ base_price - cost_price`
    * **Margen porcentual:** `((base_price - cost_price) / base_price) * 100%`
  * Si se ingresa precio de oferta, muestra también el margen resultante con la oferta aplicada.

### Paso 3: Stock y Categorías
* **Stock Inicial (`stock`):** Input numérico entero (mínimo 0, valor por defecto 0) con controles de incremento/decremento.
* **Categoría (`category_id`):** Dropdown/Select obligatorio que consulta las categorías activas.
* **Creación Rápida de Categoría (Inline Expandable):**
  * Botón *"Nueva categoría rápida"* que despliega un panel inline dentro del mismo paso.
  * Permite ingresar nombre de categoría y guardarla al instante en Supabase sin perder el estado del wizard. Al guardarse, se selecciona automáticamente en el dropdown.

### Paso 4: Imágenes del Producto
* **Estructura:** Lista dinámica de imágenes (`images: string[]`), donde la **primera imagen actúa como portada principal** y las subsiguientes como galería secundaria opcional.
* **Métodos de Carga:**
  * **Por URL externa:** Campo de texto para pegar el enlace directo a la imagen con previsualizador inmediato.
  * **Desde el Dispositivo / Cámara:** Input de archivo (`accept="image/*"`) que abre la cámara o galería en celulares y el explorador en computadoras.
* **Almacenamiento:** Subida automática del archivo a **Supabase Storage** (bucket `products` o `media`) para obtener la URL pública definitiva. Si se está sin conexión, se preserva localmente para sincronización posterior.

### Paso 5: Estados, Resumen y Confirmación
* **Toggles de Estado:**
  * **Activo (`is_active`):** Switch booleano (por defecto `true`). Determina la visibilidad en la tienda.
  * **Destacado (`is_highlight`):** Switch booleano (por defecto `false`). Indica si aparece en la vitrina principal.
  * **En Oferta (`is_on_sale`):** Switch booleano (por defecto `false`, o activado automáticamente si se cargó un `sale_price`).
* **Ficha Técnica de Resumen:**
  * Tarjeta visual que consolida: Foto de portada, Nombre, Marca, Categoría, Precios, Margen y Stock para revisión final antes del guardado.
* **Acciones de Guardado:**
  * Botón *"Cancelar"*: Cierra el modal previa confirmación si hay datos sin guardar.
  * Botón *"Guardar Producto"*: Con estado `[loading]`, realiza el guardado en Supabase:
    * Si hay conexión: Guarda en Supabase y muestra mensaje de éxito.
    * Si no hay conexión (Offline): Avisa que el producto quedó encolado y se sincronizará automáticamente al recuperar la red.
* **Flujo Post-Guardado:**
  * Al completar con éxito, se muestra un diálogo amigable con la opción:
    * *"¿Deseas registrar otro producto?"* $\rightarrow$ Limpia el formulario y regresa al Paso 1 manteniendo el modal abierto.
    * *"Finalizar"* $\rightarrow$ Cierra el modal.

---

## 3. Arquitectura Técnica y Optimus UI

* **Lazy Loading:** Ruta `/productos` en `app.routes.ts` cargada mediante `loadComponent: () => import(...)`.
* **Tokens y Tema:** Estilización nativa a través de `BackofficeTheme` (Aura con Indigo primario y Slate oscuro), sin clases utilitarias `!important` redundantes.
* **Componentes de Optimus UI:**
  * `Stepper`, `StepList`, `StepPanels`, `StepItem`, `Step`, `StepPanel` (`@openng/optimus-ui/stepper`)
  * `ProgressBar` (`@openng/optimus-ui/progressbar`)
  * `Select` (`@openng/optimus-ui/select`)
  * `InputText` (`@openng/optimus-ui/inputtext`)
  * `InputNumber` (`@openng/optimus-ui/inputnumber`)
  * `ToggleSwitch` (`@openng/optimus-ui/toggleswitch`)
  * `Button` (`@openng/optimus-ui/button`)
  * `Dialog` (`@openng/optimus-ui/dialog`)
* **Tests Unitarios:** Suite completa con Vitest para validar cada paso, cálculo de márgenes, navegación y validaciones cruzadas.

