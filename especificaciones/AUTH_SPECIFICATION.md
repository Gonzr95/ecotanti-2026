# Especificación del Sistema de Autenticación y Control de Accesos (RBAC)

---

# PARTE 1: Resumen Ejecutivo

* **Logins Separados:** Cada aplicación tiene su propia pantalla de acceso independiente. El Storefront maneja clientes y el Backoffice maneja exclusivamente al personal administrativo.
* **Storefront (Clientes):** Autenticación vía Email/Contraseña y **Google OAuth**. Soporta compra flexible (Guest Checkout) con opción de crear contraseña al finalizar. Manejo de sesiones mediante **Cookies (`@supabase/ssr`)** para evitar parpadeos en Server-Side Rendering (SSR).
* **Recuperación de Contraseña:** Flujo seguro vía correo electrónico gestionado nativamente por Supabase Auth (`/olvide-password` -> correo con enlace de un solo uso -> `/restablecer-password`), disponible tanto para clientes como para empleados.
* **Backoffice (Personal):** Basado en un **modelo RBAC Granular** (Roles y Permisos atómicos). El Super Admin inicial se provisiona manualmente en Supabase; los demás empleados se dan de alta desde un Panel de Usuarios interno que genera y envía por correo una contraseña temporal.
* **Sesión Offline en PWA:** Si el empleado ya inició sesión con conexión, la sesión se preserva localmente en el dispositivo para operar y cargar productos sin internet.
* **Seguridad y Auditoría:** Si un cliente intenta iniciar sesión en el Backoffice, se aplica **ofuscación de seguridad** (muestra *"Credenciales incorrectas"* como si fallara la contraseña) y se dispara un registro silencioso en una tabla de auditoría (`security_logs`) en Supabase para alertar al dueño.
* **Monorepo (Nx):** La lógica de Supabase, interfaces y métodos comunes de sesión se centralizan en una librería compartida (`libs/shared-auth`).

---

# PARTE 2: Especificación Técnica Detallada

## 1. Arquitectura de Código en el Monorepo

Toda la lógica de autenticación se modulariza para ser reutilizable entre ambas aplicaciones sin duplicar código:

```text
ecotanti/
├── libs/
│   └── shared-auth/             # Librería compartida de autenticación en Nx
│       ├── src/
│       │   ├── lib/
│       │   │   ├── services/    # SupabaseClientFactory, AuthService, RoleService
│       │   │   ├── models/      # Interfaces: UserProfile, Role, Permission, AuthState
│       │   │   ├── guards/      # authGuard, staffGuard, permissionGuard
│       │   │   └── directives/  # hasPermission directive
│       │   └── index.ts         # Exportaciones públicas (@ecotanti/shared-auth)
├── projects/
│   ├── storefront/              # Consume login cliente, cookies SSR, guest checkout y authGuard
│   └── backoffice/              # Consume login staff, staffGuard y offline persistence
```

---

## 2. Modelo de Datos para Auth & RBAC (Sincronizado con `DATABASE_SCHEMA.md`)

Estructura oficial creada en Supabase:

```sql
-- 1. Perfiles de usuario (extiende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Catálogo de Permisos Granulares
CREATE TABLE public.permissions (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,            -- Ej: 'products:create', 'orders:read', 'users:manage'
  name TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,                 -- 'catalog', 'orders', 'settings', 'staff'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roles del Sistema
CREATE TABLE public.roles (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,            -- Ej: 'super_admin', 'editor', 'vendedor'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Relación Muchos a Muchos: Roles <-> Permisos
CREATE TABLE public.role_permissions (
  rol_id INT8 REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INT8 REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permission_id)
);

-- 5. Asignación de Roles a Usuarios (Solo el personal tiene registros aquí)
CREATE TABLE public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id INT8 REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 6. Registro de Auditoría y Seguridad
CREATE TABLE public.security_logs (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_mail TEXT,
  username TEXT,
  event_type TEXT,                      -- 'unauthorized_backoffice_attempt', 'password_reset_requested', etc.
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Regla de Oro del Modelo:
* **Cliente:** Existe en `auth.users` y `public.profiles`. **No tiene registros** en `public.user_roles`.
* **Personal / Empleado:** Existe en `auth.users`, `public.profiles` y tiene al menos un registro en `public.user_roles`.

---

## 3. Flujo en el Storefront (Clientes)

### 3.1. Métodos de Acceso
* **Email + Contraseña:** Registro estándar con validación de correo.
* **Google OAuth:** Login rápido con un clic usando `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### 3.2. Gestión de Sesión en SSR (`@supabase/ssr`)
* El Storefront utiliza almacenamiento de sesión en **Cookies**.
* Cuando el usuario solicita una página al servidor de Angular SSR, el token viaja en las cabeceras HTTP. El servidor renderiza el HTML conociendo el estado del usuario (ej: *"Bienvenido, Gonzalo"* en el encabezado) eliminando el efecto de parpadeo (FOUC).

### 3.3. Compra Flexible (Guest Checkout)
* Un cliente puede completar el checkout ingresando solo Nombre, Email, Teléfono y Dirección.
* Al finalizar el pedido con éxito, se le muestra:
  > *"¿Deseas guardar tus datos para tu próxima compra? Crea una contraseña aquí."*
* Si crea la contraseña, el sistema crea la cuenta en Supabase y asocia la orden recién generada a su nuevo `user_id`.

### 3.4. Flujo de Recuperación de Contraseña (Password Reset)
1. **Solicitud (`/olvide-password`):**
   * El usuario ingresa su correo electrónico.
   * El cliente ejecuta:
     ```typescript
     await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: `${window.location.origin}/restablecer-password`,
     });
     ```
   * Feedback en pantalla: *"Si el correo está registrado, recibirás un enlace de recuperación"*.
2. **Correo de Supabase:**
   * El usuario recibe un email con un enlace seguro y token con expiración de 1 hora.
3. **Restablecimiento (`/restablecer-password`):**
   * Al acceder desde el enlace, Supabase valida el token e inicia una sesión transitoria segura.
   * La vista presenta un formulario para ingresar la **nueva contraseña** y su confirmación.
   * Al enviar, se ejecuta:
     ```typescript
     await supabase.auth.updateUser({ password: nuevaPassword });
     ```
   * Se muestra mensaje de éxito y se redirige al login.

---

## 4. Flujo en el Backoffice (Personal)

### 4.1. Pantalla de Acceso Exclusiva
* Ruta: `/login` en el Backoffice.
* Sin enlace de "Registrarse" o "Crear cuenta".
* Formulario sobrio de Email y Contraseña con enlace a `/olvide-password`.

### 4.2. Validación de Acceso y Política de Ofuscación
Al enviar el formulario de login:
1. Se valida el email y contraseña contra Supabase Auth.
2. Si las credenciales son incorrectas: muestra *"Credenciales incorrectas"*.
3. Si las credenciales son **válidas**, el servicio consulta si el `user_id` existe en la tabla `user_roles`.
4. **Si NO tiene roles asignados (es un cliente o usuario no autorizado):**
   * Se registra el intento en `security_logs`:
     ```typescript
     {
       attempted_mail: email,
       event_type: 'unauthorized_backoffice_attempt',
       metadata: { reason: 'User authenticated but has no staff roles' }
     }
     ```
   * Se destruye de inmediato la sesión recién creada (`supabase.auth.signOut()`).
   * **Se muestra el mensaje idéntico al fallo de contraseña:** *"Credenciales incorrectas"* (ofuscación total).
5. **Si TIENE roles asignados:**
   * Se descargan sus permisos asociados (`products:create`, etc.).
   * Se redirige al panel principal `/admin`.

### 4.3. Persistencia de Sesión Offline (PWA)
* El token JWT y el listado de permisos del empleado se almacenan en el almacenamiento seguro local del dispositivo (LocalStorage / IndexedDB).
* Si el empleado abre la PWA en su celular sin conexión (depósito, viaje, etc.):
  * El Guard de Angular detecta la sesión local válida en caché.
  * Se permite el acceso al panel y a la creación de productos offline sin bloquear la pantalla solicitando conexión.

### 4.4. Onboarding de Nuevos Empleados
1. El Super Administrador ingresa a `/admin/usuarios`.
2. Presiona *"Nuevo Colaborador"*:
   * Completa: Nombre, Email y Rol asignado (`editor`, `vendedor`, etc.).
3. El sistema:
   * Crea el usuario mediante una Edge Function o endpoint administrativo (`supabase.auth.admin.createUser`).
   * Genera una contraseña temporal aleatoria.
   * Asigna el rol en `public.user_roles`.
   * Envía un correo automático al nuevo empleado con sus datos de acceso y un enlace para ingresar y actualizar su contraseña en el primer inicio de sesión.

---

## 5. Guards y Control de Acceso en Angular

Para blindar las rutas en las aplicaciones se definen tres niveles de protección:

1. **`authGuard` (Ambas apps):** Verifica que exista un usuario autenticado activo. Si no, redirige a `/login`.
2. **`staffGuard` (Backoffice):** Verifica que el usuario autenticado posea al menos un rol registrado en `user_roles`. Si no, redirige al login con error de acceso.
3. **`permissionGuard(requiredPermission: string)` (Backoffice):** Protege rutas específicas.
   * Ejemplo: La ruta `/admin/configuracion` exige el permiso `'settings:manage'`. Si un usuario con rol `vendedor` intenta ingresar por URL, es redirigido a `/admin/no-autorizado`.
4. **Directiva `*hasPermission` (Vistas de Angular):**
   * Permite ocultar o mostrar botones en tiempo de renderizado:
     ```html
     <p-button *hasPermission="'products:create'" label="Nuevo Producto" icon="pi pi-plus" />
     ```

---

## 6. Variables de Entorno y Configuración

Ambos proyectos consumirán un archivo de entorno con la estructura:

```typescript
// environment.ts (y environment.development.ts)
export const environment = {
  production: false,
  supabase: {
    url: 'https://tu-proyecto.supabase.co',
    anonKey: 'tu-clave-anon-publica'
  }
};
```
