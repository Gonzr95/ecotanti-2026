# Schema: Catalog
Database: pgsql
Tables: 8
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
base_price: float
sale_price: float nullable
is_active: boolean nullable
images: text nullable
applies_discount: boolean nullable
points_required: bigint nullable
category_id: bigint FK indexed nullable
is_highlight: boolean default:false -- This column determines if this product is a highlighted product
is_on_sale: boolean default:false -- This row determines if this product is on sale
stock: bigint
brand_id: bigint FK nullable

## bundles
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamp nullable
modified_by: uuid nullable
name: text nullable
slug: text nullable
discountPercentage: double precision nullable
totalPrice: double precision nullable
images: text nullable
validFrom: timestamp nullable
validUntil: timestamp nullable
isActive: boolean nullable

## bundles_details
productId: bigint PK FK
bundleId: bigint PK FK
productQuantity: smallint nullable default:1'::smallint

## discounts
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamptz nullable
modified_by: uuid nullable
code: text nullable
description: text nullable
discount_percentage: double precision nullable
fixed_discount: double precision nullable
aplies_to_category_id: bigint nullable
valid_from: timestamptz nullable
valid_until: timestamptz nullable
min_purchase_amount: double precision nullable
is_active: boolean nullable
quantity: bigint nullable

## orders
id: bigint PK
created_at: timestamptz default:now()
modified_at: timestamp nullable
user_id: uuid nullable
discount_id: bigint FK nullable
discountApplied: boolean nullable
status: text nullable
total_amount: double precision nullable
credit_used: double precision nullable
final_paid_amount: double precision nullable
discount_amount: double precision nullable

## order_details
id: bigint PK FK
orderId: bigint FK nullable
productId: bigint FK nullable
bundleId: bigint FK nullable
quantity: smallint nullable default:1'::smallint
created_at: timestamptz default:now()
unitPrice: double precision nullable
subtotal: double precision nullable

## brands
id: bigint PK
name: text
slug: text
created_at: timestamptz
created_by: timestamptz

## Relationships
bundles_details.productId → products.id (many-to-one)
bundles_details.bundleId → bundles.id (many-to-one)
order_details.orderId → orders.id (many-to-one)
order_details.productId → products.id (one-to-one)
bundles.id → order_details.id (one-to-one)
products.category_id → categories.id (one-to-one)
order_details.bundleId → bundles.id (many-to-one)
products.brand_id → brands.id (one-to-one)
orders.discount_id → discounts.id (one-to-one)

## Indexes
bundles_details.bundles_products_pkey (primary): productId, bundleId

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
