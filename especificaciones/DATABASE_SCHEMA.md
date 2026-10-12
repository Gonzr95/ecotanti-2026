## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `username` | `text` |  Nullable Unique |

## Table `permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `code` | `text` |  Unique |
| `name` | `text` |  Unique |
| `module` | `text` |  |
| `description` | `text` |  |

## Table `roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |

## Table `role_permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `rol_id` | `int8` | Primary Identity |
| `permission_id` | `int8` | Primary |

## Table `user_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `role_id` | `int8` | Primary |

## Table `security_logs`

stores suspicious attempts of loggin in with false credentials in admin page

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `user_id` | `uuid` |  Nullable |
| `attempted_mail` | `text` |  Nullable |
| `event_type` | `text` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `username` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `name` | `text` | Unique |
| `slug` | `text` | Unique |
| `description` | `text` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `brands`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `name` | `text` | Unique |
| `slug` | `text` | Unique |
| `logo_url` | `text` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `name` | `text` | Unique |
| `slug` | `text` | Unique |
| `description` | `text` | Nullable |
| `base_price` | `numeric(12,2)` | Not Null |
| `cost_price` | `numeric(12,2)` | Nullable |
| `stock` | `int8` | Default 0 |
| `category_id` | `int8` | FK categories(id) Nullable |
| `brand_id` | `int8` | FK brands(id) Nullable |
| `images` | `text[]` | Default '{}' |
| `is_active` | `boolean` | Default true |
| `is_highlight` | `boolean` | Default false |
| `is_on_sale` | `boolean` | Default false |
| `applies_discount` | `boolean` | Default true |
| `points_required` | `int8` | Nullable |

## Table `bundles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `name` | `text` | Unique |
| `slug` | `text` | Unique |
| `description` | `text` | Nullable |
| `total_price` | `numeric(12,2)` | Not Null |
| `discount_percentage` | `numeric(5,2)` | Nullable |
| `images` | `text[]` | Default '{}' |
| `valid_from` | `timestamptz` | Nullable |
| `valid_until` | `timestamptz` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `bundle_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `bundle_id` | `int8` | Primary FK bundles(id) |
| `product_id` | `int8` | Primary FK products(id) |
| `quantity` | `int2` | Default 1 |

## Table `discounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `code` | `text` | Unique Nullable |
| `name` | `text` | Not Null |
| `description` | `text` | Nullable |
| `discount_percentage` | `numeric(5,2)` | Nullable |
| `fixed_discount` | `numeric(12,2)` | Nullable |
| `category_id` | `int8` | FK categories(id) Nullable |
| `min_purchase_amount` | `numeric(12,2)` | Nullable |
| `max_uses` | `int8` | Nullable |
| `uses_count` | `int8` | Default 0 |
| `valid_from` | `timestamptz` | Nullable |
| `valid_until` | `timestamptz` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `offers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `name` | `text` | Not Null |
| `slug` | `text` | Unique |
| `description` | `text` | Nullable |
| `image_url` | `text` | Nullable |
| `logo_url` | `text` | Nullable |
| `promotion_starts_at` | `timestamptz` | Nullable |
| `valid_from` | `timestamptz` | Nullable |
| `valid_until` | `timestamptz` | Nullable |
| `discount_percentage` | `numeric(5,2)` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `offer_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `offer_id` | `int8` | FK offers(id) |
| `product_id` | `int8` | FK products(id) Nullable |
| `bundle_id` | `int8` | FK bundles(id) Nullable |
| `price` | `numeric(12,2)` | Nullable |
| `is_active` | `boolean` | Default true |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` | Default now() |
| `updated_at` | `timestamptz` | Nullable |
| `order_number` | `text` | Unique |
| `user_id` | `uuid` | FK auth.users(id) Nullable |
| `status` | `text` | Default 'pending' |
| `subtotal_amount` | `numeric(12,2)` | Not Null |
| `discount_id` | `int8` | FK discounts(id) Nullable |
| `discount_applied` | `boolean` | Default false |
| `discount_amount` | `numeric(12,2)` | Default 0 |
| `shipping_cost` | `numeric(12,2)` | Default 0 |
| `total_amount` | `numeric(12,2)` | Not Null |
| `credit_used` | `numeric(12,2)` | Default 0 |
| `final_paid_amount` | `numeric(12,2)` | Nullable |
| `payment_method` | `text` | Default 'bank_transfer' |
| `payment_status` | `text` | Default 'pending' |
| `notes` | `text` | Nullable |

## Table `order_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `order_id` | `int8` | FK orders(id) |
| `product_id` | `int8` | FK products(id) Nullable |
| `bundle_id` | `int8` | FK bundles(id) Nullable |
| `offer_item_id` | `int8` | FK offer_items(id) Nullable |
| `item_type` | `text` | Not Null |
| `item_name` | `text` | Not Null |
| `regular_price` | `numeric(12,2)` | Not Null |
| `unit_price` | `numeric(12,2)` | Not Null |
| `cost_price` | `numeric(12,2)` | Default 0 |
| `quantity` | `int2` | Default 1 |
| `subtotal` | `numeric(12,2)` | Not Null |
| `created_at` | `timestamptz` | Default now() |

## Table `order_deliveries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `order_id` | `int8` | Unique FK orders(id) |
| `recipient_name` | `text` | Not Null |
| `recipient_email` | `text` | Not Null |
| `recipient_phone` | `text` | Not Null |
| `recipient_dni` | `text` | Nullable |
| `shipping_method` | `text` | Not Null |
| `shipping_cost` | `numeric(12,2)` | Default 0 |
| `address_line` | `text` | Nullable |
| `city` | `text` | Nullable |
| `province` | `text` | Nullable |
| `postal_code` | `text` | Nullable |
| `notes` | `text` | Nullable |
| `tracking_number` | `text` | Nullable |
| `created_at` | `timestamptz` | Default now() |

## Storage `media`

Bucket para almacenamiento de archivos multimedia.

### Carpetas:
* `users/`: Avatares y fotos de perfil de usuarios (enlace con `profiles.avatar_url`).
* `products/`: Fotografías e imágenes del catálogo de productos y combos.
* `offers/`: Banners e imágenes promocionales de ofertas y campañas.
