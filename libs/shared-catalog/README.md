# @ecotanti/shared-catalog

Librería de dominio desacoplada y reutilizable para E-Commerce: **Catálogo, Combos, Inventario, Descuentos, Pedidos, Logística y Análisis de Rentabilidad**.

Forma parte del monorepo **EcoTanti** y está diseñada con arquitectura modular para ser consumida tanto por la tienda pública (`projects/storefront`) como por el panel de administración (`projects/backoffice`), así como ser exportada o reutilizada en futuros proyectos e-commerce sin cambios estructurales.

---

## 🎯 Capacidades Principales

### 1. Catálogo de Productos y Marcas
* **Gestión Jerárquica:** Categorías y Marcas con slugs amigables para SEO y URLs limpias.
* **Productos Simples:** Manejo ágil de productos con precio base (`base_price`), precio promocional (`sale_price`), costo de reposición (`cost_price`), destacados (`is_highlight`) y en oferta (`is_on_sale`).
* **Galería Multimedia:** Soporte de múltiples imágenes por producto (`images: string[]`) integradas con Supabase Storage (`media/products`).

### 2. Combos y Promociones Dinámicas (`Bundles`)
* **Agrupación de Productos:** Creación de packs o combos que contienen múltiples unidades de distintos productos con precio total unificado (`total_price`).
* **Stock Dinámico Virtual:** El inventario disponible de un combo no es estático; se calcula en tiempo real a partir del stock mínimo disponible de los productos individuales que lo componen.

### 3. Control Atómico de Inventario
* **Reserva y Deducción en Venta:** Trigger automático a nivel de base de datos que descuenta unidades de stock físico de cada producto tan pronto como se confirma un pedido.
* **Restitución por Cancelación:** Si un pedido pasa a estado `cancelled`, el sistema revierte automáticamente el stock a los productos correspondientes.
* **Manejo de Quiebre de Stock:** Validación preventiva para impedir órdenes con cantidades superiores a la existencia real.

### 4. Motor de Descuentos y Cupones
* **Tipos de Descuento:** Soporte para cupones porcentuales (`discount_percentage`) o montos fijos en moneda (`fixed_discount`).
* **Reglas de Aplicación:**
  * Compra mínima requerida (`min_purchase_amount`).
  * Restricción por categoría de producto (`category_id`).
  * Período de vigencia con marcas temporales (`valid_from` y `valid_until`).
  * Límite de usos máximos (`max_uses`) y contador acumulador (`uses_count`).

### 5. Gestión de Pedidos y Checkout Híbrido
* **Clientes Registrados e Invitados (Guest Checkout):** Permite procesar compras tanto de usuarios autenticados (`user_id = UUID`) como de compradores sin cuenta (`user_id = NULL`).
* **Histórico Inmutable (`order_details`):** Congelamiento de datos al momento de la venta (`item_name`, `unit_price`, `unit_cost`, `subtotal`). Si el producto sube de precio o cambia de nombre en el catálogo mañana, el comprobante y la orden del cliente se mantienen inalterados.
* **Logística Satélite (`order_deliveries`):** Separación limpia de datos de envío (destinatario, DNI, teléfono, método de envío, dirección y número de seguimiento/tracking).

### 6. Análisis Financiero y Margen de Ganancias (*Profit Intelligence*)
* **Costo Histórico Congelado:** Cada línea de pedido almacena el costo unitario (`unit_cost`) al momento exacto de la compra (inmune a la inflación y a futuros aumentos del proveedor).
* **Cálculo de Ganancia Bruta:**
  $$\text{Ganancia Bruta} = \sum \Big( \text{quantity} \times (\text{unit\_price} - \text{unit\_cost}) \Big) - \text{discount\_amount}$$
* **Margen de Rentabilidad Operativa (%):** Permite al backoffice conocer el margen real por pedido, por producto, por categoría o por rango de fechas.

---

## 🏛️ Estructura de la Librería

```
libs/shared-catalog/
├── src/
│   ├── lib/
│   │   ├── models/            # Interfaces TypeScript que tipan las 9 tablas de Supabase
│   │   │   ├── catalog.models.ts   # Categorías, Marcas, Productos, Combos
│   │   │   ├── discount.models.ts  # Descuentos y Cupones
│   │   │   ├── order.models.ts     # Pedidos, Detalles de Pedido y Logística
│   │   │   └── analytics.models.ts # Métricas de rentabilidad y reportes de ganancia
│   │   │
│   │   ├── services/          # Servicios Angular v22 (@Service)
│   │   │   ├── catalog.service.ts   # Consultas y filtros de productos y combos
│   │   │   ├── orders.service.ts    # Creación y seguimiento de órdenes
│   │   │   ├── discounts.service.ts # Validación y aplicación de cupones
│   │   │   └── analytics.service.ts # Fórmulas y reportes de ganancias/costos
│   │   │
│   │   ├── state/             # Gestión de estado reactivo con Angular Signals
│   │   │   └── cart.store.ts        # Carrito de compras y cálculo de totales en memoria
│   │   │
│   │   └── utils/             # Helpers puros de cálculo monetario y márgenes
│   │       └── financial-calculator.ts
│   │
│   └── index.ts               # Punto de entrada público (@ecotanti/shared-catalog)
├── project.json
├── tsconfig.json
└── README.md
```

---

## 🔌 Principios de Reusabilidad y Desacoplamiento

1. **Agnóstica a la UI:** La librería no impone componentes visuales rígidos ni estilos atados a una sola aplicación. Provee modelos, servicios de datos, validaciones de negocio y estado reactivo para que tanto el Storefront como el Backoffice rendericen sus propias interfaces.
2. **Inyección de Supabase:** Se apoya en el cliente provisto por `@ecotanti/shared-auth`, garantizando que todas las operaciones respeten las políticas de seguridad **Row Level Security (RLS)** de PostgreSQL.
3. **Tipado Estricto:** Cada entidad y enumeración (`OrderStatus`, `PaymentStatus`, `ShippingMethod`) está fuertemente tipada en TypeScript para evitar discrepancias en tiempo de compilación.
