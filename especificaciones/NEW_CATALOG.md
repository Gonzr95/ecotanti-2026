# Schema: Catalog
Database: pgsql
Tables: 11
Columns are NOT NULL unless marked nullable.

## categories
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamptz nullable
modified_by: uuid nullable
name: text nullable
slug: text nullable

## products
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamp nullable
modified_by: uuid nullable
name: text unique
slug: text unique
description: text
base_price: numeric(12,2)
is_active: boolean nullable
images: text nullable
applies_discount: boolean nullable
points_required: bigint nullable
category_id: bigint FK indexed nullable
is_highlight: boolean default:false -- This column determines if this product is a highlighted product
is_on_sale: boolean default:false -- This row determines if this product is on sale
stock: bigint
brand_id: bigint FK nullable
cost_price: numeric(12,2)

## bundles
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamp nullable
modified_by: uuid nullable
name: text nullable
slug: text nullable
discount_percentage: numeric(5,2) nullable
total_price: numeric(12,2) nullable
images: text nullable
valid_from: timestamp nullable
valid_until: timestamp nullable
is_active: boolean nullable

## bundle_items
product_id: bigint PK FK
bundle_id: bigint PK FK
product_quantity: smallint nullable default:1'::smallint

## discounts
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamptz nullable
modified_by: uuid nullable
code: text nullable
name: text
description: text nullable
discount_percentage: numeric(5,2) nullable
fixed_discount: numeric(12,2) nullable
aplies_to_category_id: bigint nullable
valid_from: timestamptz nullable
valid_until: timestamptz nullable
min_purchase_amount: numeric(12,2) nullable
is_active: boolean nullable
quantity: bigint nullable

## orders
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamp nullable
user_id: uuid nullable
discount_id: bigint FK nullable
discount_applied: boolean nullable
status: text nullable
total_amount: numeric(12,2) nullable
credit_used: numeric(12,2) nullable
final_paid_amount: numeric(12,2) nullable
discount_amount: numeric(12,2) nullable

## order_details
id: bigint PK
order_id: bigint FK nullable
product_id: bigint FK nullable
bundle_id: bigint FK nullable
offer_item_id: bigint FK nullable
quantity: smallint nullable default:1'::smallint
created_at: timestamptz default:now()
unit_price: numeric(12,2) nullable -- precio al que efectivamente se vendio
subtotal: numeric(12,2) nullable
regular_price: numeric(12,2) -- precio de lista sin oferta
cost_price: numeric(12,2) -- costo del producto para trazar que tan bien performo una oferta al momento de la venta

## brands
id: bigint PK
name: text
slug: text
created_at: timestamptz
created_by: timestamptz

## offers
id: bigint PK
name: text
slug: text
description: text
image_url: text
logo_url: text
promotion_starts_at: timestamptz
valid_from: timestamptz
valid_until: timestamptz
discount_percentage: numeric(5,2)
is_active: boolean

## offer_items
id: bigint PK
offer_id: bigint PK FK
product_id: bigint FK
bundle_id: bigint FK
price: numeric(12,2)
is_active: boolean

## order_deliveries
id: bigint PK
order_id: bigint FK
recipient_name: text
recipient_email: text
recipient_phone: text
recipient_dni: text
shipping_method: text
shipping_cost: numeric(12,2)
address_line: text
city: text
province: text
postal_code: text
tracking_number: text

## Relationships
bundles_details.product_id → products.id (many-to-one)
bundles_details.bundle_id → bundles.id (many-to-one)
order_details.order_id → orders.id (many-to-one)
order_details.product_id → products.id (one-to-one)
products.category_id → categories.id (one-to-one)
order_details.bundle_id → bundles.id (many-to-one)
products.brand_id → brands.id (one-to-one)
orders.discount_id → discounts.id (one-to-one)
products.id → offer_items.product_id (one-to-many)
bundles.id → offer_items.bundle_id (one-to-many)
offer_items.offer_id → offers.id (many-to-one)
offer_items.id → order_details.offer_item_id (one-to-many)
orders.id → order_deliveries.order_id (one-to-one)

## Indexes
bundles_details.bundles_products_pkey (primary): product_id, bundle_id

---
If you suggest changes to this schema, ALSO return them as a DrawSQL patch: one fenced ```json code block, so I can apply them to my diagram. If you are only answering a question, skip the patch.

Patch rules:
- One JSON object with "strategy": "merge"; combine every change into that single patch.
- Reference tables and columns by name. Only include what changes — omit unchanged columns and unused optional fields.
- Column: {"name","type","length","is_primary_key","is_auto_increment","is_nullable","is_unique_key","is_index","is_unsigned","default","enum_values"} — use exact type names for pgsql as shown in the schema above.
- Relationship: {"type":"one-to-many","source_table":"users","source_column":"id","target_table":"posts","target_column":"user_id"} — for "one-to-many" the source is the "one" side; for "many-to-one" the source is the "many" (foreign-key) side. Prefer "one-to-many".
- Add "default_type" ("string" | "function" | "number" | "boolean") when a default could be misread — a literal string "CURRENT_TIMESTAMP" or "0" needs "default_type":"string".
- SET columns (MySQL) list their members in "set_values", not "enum_values".
- Index: {"indexes":[{"name":"idx_posts_user_created","type":"index","columns":["user_id","created_at"]}]} on its table — "type" is "index" or "unique"; delete via "deletions".
- Group: {"name":"Billing"}. A group never lists its members — put "parent_name":"Billing" on each table that belongs to it.
- Sticky note: {"sticky_notes":[{"content":"..."}]}.
- Delete via "deletions"; rename via "old_name". Do not include left/top coordinates.

Examples:
Add table: `{"strategy":"merge","tables":[{"name":"posts","comment":"Blog posts","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true},{"name":"user_id","type":"bigint","is_index":true},{"name":"title","type":"varchar","length":255},{"name":"body","type":"text","is_nullable":true},{"name":"created_at","type":"timestamp","is_nullable":true},{"name":"updated_at","type":"timestamp","is_nullable":true}]}]}`
Rename table and column (use old_name only when renaming): `{"strategy":"merge","tables":[{"name":"articles","old_name":"posts","columns":[{"name":"content","old_name":"body"}]}]}`
Delete: `{"strategy":"merge","deletions":{"tables":["tmp"],"columns":[{"table":"users","columns":["legacy"]}],"relationships":[{"source_table":"users","source_column":"id","target_table":"posts","target_column":"user_id"}]}}`
Multiple groups with nested tables (every table sets parent_name): `{"strategy":"merge","groups":[{"name":"Auth"},{"name":"Content"}],"tables":[{"name":"users","parent_name":"Auth","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]},{"name":"roles","parent_name":"Auth","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]},{"name":"posts","parent_name":"Content","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]}]}`
