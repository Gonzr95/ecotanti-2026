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

