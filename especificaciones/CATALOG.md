# Schema: Catalog, Orders & Inventory (EcoTanti E-Commerce)
Database: pgsql
Tables: 9
Columns are NOT NULL unless marked nullable.

## categories
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
name: text unique
slug: text unique
description: text nullable
is_active: boolean default:true

## brands
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
name: text unique
slug: text unique
logo_url: text nullable
is_active: boolean default:true

## products
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
name: text unique
slug: text unique
description: text nullable
base_price: numeric(12,2)
sale_price: numeric(12,2) nullable
cost_price: numeric(12,2) nullable
stock: bigint default:0
category_id: bigint FK indexed nullable
brand_id: bigint FK indexed nullable
images: text[] default:'{}'
is_active: boolean default:true
is_highlight: boolean default:false
is_on_sale: boolean default:false

## bundles
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
name: text unique
slug: text unique
description: text nullable
total_price: numeric(12,2)
discount_percentage: numeric(5,2) nullable
images: text[] default:'{}'
valid_from: timestamptz nullable
valid_until: timestamptz nullable
is_active: boolean default:true

## bundle_items
bundle_id: bigint PK FK
product_id: bigint PK FK
quantity: smallint default:1

## discounts
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
code: text unique
description: text nullable
discount_percentage: numeric(5,2) nullable
fixed_discount: numeric(12,2) nullable
category_id: bigint FK nullable
min_purchase_amount: numeric(12,2) nullable
max_uses: bigint nullable
uses_count: bigint default:0
valid_from: timestamptz nullable
valid_until: timestamptz nullable
is_active: boolean default:true

## orders
id: bigint PK identity
created_at: timestamptz default:now()
updated_at: timestamptz nullable
order_number: text unique
user_id: uuid FK nullable -- Nullable para compra como invitado (Guest checkout)
status: text default:'pending' -- pending, paid, preparing, shipped, ready_for_pickup, delivered, cancelled
subtotal_amount: numeric(12,2)
discount_id: bigint FK nullable
discount_amount: numeric(12,2) default:0
shipping_cost: numeric(12,2) default:0
total_amount: numeric(12,2)
payment_method: text default:'bank_transfer'
payment_status: text default:'pending'
notes: text nullable

## order_details
id: bigint PK identity
order_id: bigint FK
product_id: bigint FK nullable
bundle_id: bigint FK nullable
item_type: text -- 'product' o 'bundle'
item_name: text -- Nombre congelado al momento de la compra
unit_price: numeric(12,2) -- Precio unitario congelado
unit_cost: numeric(12,2) default:0 -- Costo unitario congelado al momento de la compra
quantity: smallint default:1
subtotal: numeric(12,2) -- Subtotal congelado

## order_deliveries
id: bigint PK identity
order_id: bigint FK unique -- Relación 1 a 1 con orders
recipient_name: text
recipient_email: text
recipient_phone: text
recipient_dni: text nullable
shipping_method: text -- 'pickup', 'local_delivery', 'national_shipping'
shipping_cost: numeric(12,2) default:0
address_line: text nullable
city: text nullable
province: text nullable
postal_code: text nullable
notes: text nullable
tracking_number: text nullable
created_at: timestamptz default:now()

## Relationships
products.category_id → categories.id (many-to-one)
products.brand_id → brands.id (many-to-one)
bundle_items.bundle_id → bundles.id (many-to-one)
bundle_items.product_id → products.id (many-to-one)
discounts.category_id → categories.id (many-to-one)
orders.user_id → auth.users.id (many-to-one)
orders.discount_id → discounts.id (many-to-one)
order_details.order_id → orders.id (many-to-one)
order_details.product_id → products.id (many-to-one)
order_details.bundle_id → bundles.id (many-to-one)
order_deliveries.order_id → orders.id (one-to-one)

## Indexes
bundle_items.bundle_items_pkey (primary): bundle_id, product_id
products.idx_products_category: category_id
products.idx_products_brand: brand_id
orders.idx_orders_user: user_id
orders.idx_orders_status: status
order_details.idx_order_details_order: order_id
order_deliveries.idx_order_deliveries_order: order_id

---
### DrawSQL Patch

```json
{
  "strategy": "merge",
  "tables": [
    {
      "name": "categories",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "name", "type": "text", "is_unique_key": true },
        { "name": "slug", "type": "text", "is_unique_key": true },
        { "name": "description", "type": "text", "is_nullable": true },
        { "name": "is_active", "type": "boolean", "default": "true" }
      ]
    },
    {
      "name": "brands",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "name", "type": "text", "is_unique_key": true },
        { "name": "slug", "type": "text", "is_unique_key": true },
        { "name": "logo_url", "type": "text", "is_nullable": true },
        { "name": "is_active", "type": "boolean", "default": "true" }
      ]
    },
    {
      "name": "products",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "name", "type": "text", "is_unique_key": true },
        { "name": "slug", "type": "text", "is_unique_key": true },
        { "name": "description", "type": "text", "is_nullable": true },
        { "name": "base_price", "type": "numeric(12,2)" },
        { "name": "sale_price", "type": "numeric(12,2)", "is_nullable": true },
        { "name": "cost_price", "type": "numeric(12,2)", "is_nullable": true },
        { "name": "stock", "type": "bigint", "default": "0" },
        { "name": "category_id", "type": "bigint", "is_nullable": true, "is_index": true },
        { "name": "brand_id", "type": "bigint", "is_nullable": true, "is_index": true },
        { "name": "images", "type": "text[]", "default": "'{}'" },
        { "name": "is_active", "type": "boolean", "default": "true" },
        { "name": "is_highlight", "type": "boolean", "default": "false" },
        { "name": "is_on_sale", "type": "boolean", "default": "false" }
      ]
    },
    {
      "name": "bundles",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "name", "type": "text", "is_unique_key": true },
        { "name": "slug", "type": "text", "is_unique_key": true },
        { "name": "description", "type": "text", "is_nullable": true },
        { "name": "total_price", "type": "numeric(12,2)" },
        { "name": "discount_percentage", "type": "numeric(5,2)", "is_nullable": true },
        { "name": "images", "type": "text[]", "default": "'{}'" },
        { "name": "valid_from", "type": "timestamptz", "is_nullable": true },
        { "name": "valid_until", "type": "timestamptz", "is_nullable": true },
        { "name": "is_active", "type": "boolean", "default": "true" }
      ]
    },
    {
      "name": "bundle_items",
      "old_name": "bundles_details",
      "columns": [
        { "name": "bundle_id", "old_name": "bundleId", "type": "bigint", "is_primary_key": true },
        { "name": "product_id", "old_name": "productId", "type": "bigint", "is_primary_key": true },
        { "name": "quantity", "old_name": "productQuantity", "type": "smallint", "default": "1" }
      ]
    },
    {
      "name": "discounts",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "code", "type": "text", "is_unique_key": true },
        { "name": "description", "type": "text", "is_nullable": true },
        { "name": "discount_percentage", "type": "numeric(5,2)", "is_nullable": true },
        { "name": "fixed_discount", "type": "numeric(12,2)", "is_nullable": true },
        { "name": "category_id", "old_name": "aplies_to_category_id", "type": "bigint", "is_nullable": true },
        { "name": "min_purchase_amount", "type": "numeric(12,2)", "is_nullable": true },
        { "name": "max_uses", "old_name": "quantity", "type": "bigint", "is_nullable": true },
        { "name": "uses_count", "type": "bigint", "default": "0" },
        { "name": "valid_from", "type": "timestamptz", "is_nullable": true },
        { "name": "valid_until", "type": "timestamptz", "is_nullable": true },
        { "name": "is_active", "type": "boolean", "default": "true" }
      ]
    },
    {
      "name": "orders",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" },
        { "name": "updated_at", "type": "timestamptz", "is_nullable": true },
        { "name": "order_number", "type": "text", "is_unique_key": true },
        { "name": "user_id", "type": "uuid", "is_nullable": true, "is_index": true },
        { "name": "status", "type": "text", "default": "'pending'" },
        { "name": "subtotal_amount", "type": "numeric(12,2)" },
        { "name": "discount_id", "type": "bigint", "is_nullable": true },
        { "name": "discount_amount", "type": "numeric(12,2)", "default": "0" },
        { "name": "shipping_cost", "type": "numeric(12,2)", "default": "0" },
        { "name": "total_amount", "type": "numeric(12,2)" },
        { "name": "payment_method", "type": "text", "default": "'bank_transfer'" },
        { "name": "payment_status", "type": "text", "default": "'pending'" },
        { "name": "notes", "type": "text", "is_nullable": true }
      ]
    },
    {
      "name": "order_details",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "order_id", "old_name": "orderId", "type": "bigint", "is_index": true },
        { "name": "product_id", "old_name": "productId", "type": "bigint", "is_nullable": true },
        { "name": "bundle_id", "old_name": "bundleId", "type": "bigint", "is_nullable": true },
        { "name": "item_type", "type": "text" },
        { "name": "item_name", "type": "text" },
        { "name": "unit_price", "old_name": "unitPrice", "type": "numeric(12,2)" },
        { "name": "unit_cost", "type": "numeric(12,2)", "default": "0" },
        { "name": "quantity", "type": "smallint", "default": "1" },
        { "name": "subtotal", "type": "numeric(12,2)" }
      ]
    },
    {
      "name": "order_deliveries",
      "columns": [
        { "name": "id", "type": "bigint", "is_primary_key": true, "is_auto_increment": true },
        { "name": "order_id", "type": "bigint", "is_unique_key": true },
        { "name": "recipient_name", "type": "text" },
        { "name": "recipient_email", "type": "text" },
        { "name": "recipient_phone", "type": "text" },
        { "name": "recipient_dni", "type": "text", "is_nullable": true },
        { "name": "shipping_method", "type": "text" },
        { "name": "shipping_cost", "type": "numeric(12,2)", "default": "0" },
        { "name": "address_line", "type": "text", "is_nullable": true },
        { "name": "city", "type": "text", "is_nullable": true },
        { "name": "province", "type": "text", "is_nullable": true },
        { "name": "postal_code", "type": "text", "is_nullable": true },
        { "name": "notes", "type": "text", "is_nullable": true },
        { "name": "tracking_number", "type": "text", "is_nullable": true },
        { "name": "created_at", "type": "timestamptz", "default": "now()" }
      ]
    }
  ],
  "relationships": [
    { "type": "one-to-many", "source_table": "categories", "source_column": "id", "target_table": "products", "target_column": "category_id" },
    { "type": "one-to-many", "source_table": "brands", "source_column": "id", "target_table": "products", "target_column": "brand_id" },
    { "type": "one-to-many", "source_table": "bundles", "source_column": "id", "target_table": "bundle_items", "target_column": "bundle_id" },
    { "type": "one-to-many", "source_table": "products", "source_column": "id", "target_table": "bundle_items", "target_column": "product_id" },
    { "type": "one-to-many", "source_table": "categories", "source_column": "id", "target_table": "discounts", "target_column": "category_id" },
    { "type": "one-to-many", "source_table": "orders", "source_column": "id", "target_table": "order_details", "target_column": "order_id" },
    { "type": "one-to-many", "source_table": "products", "source_column": "id", "target_table": "order_details", "target_column": "product_id" },
    { "type": "one-to-many", "source_table": "bundles", "source_column": "id", "target_table": "order_details", "target_column": "bundle_id" },
    { "type": "one-to-many", "source_table": "discounts", "source_column": "id", "target_table": "orders", "target_column": "discount_id" },
    { "type": "one-to-many", "source_table": "orders", "source_column": "id", "target_table": "order_deliveries", "target_column": "order_id" }
  ]
}
```
