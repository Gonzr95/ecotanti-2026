# @ecotanti/shared-auth

Librería compartida de autenticación y conexión a Supabase para el monorepo **EcoTanti**.  
Es consumida tanto por `projects/storefront` como por `projects/backoffice`.

---

## 🏛️ Arquitectura: ¿Por qué Provider + Servicio?

En un monorepo con múltiples aplicaciones, las librerías compartidas (`libs/*`) **no deben importar archivos de entorno de aplicaciones específicas** (`projects/*`), ya que eso rompería el desacoplamiento y la reusabilidad.

Para resolver esto de forma limpia, la arquitectura se divide en dos responsabilidades:

### 1. El Provider (`provideSupabase`)
* **Responsabilidad:** Actúa como puente de inyección de dependencias entre la aplicación y la librería.
* **Dónde se usa:** En el archivo `app.config.ts` de cada aplicación (`storefront` y `backoffice`).
* **Qué hace:** Recibe el objeto `environment` de esa app y registra las credenciales (`supabaseUrl` y `supabaseKey`) en el árbol de inyección de Angular mediante un `InjectionToken`.

```typescript
// En app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideSupabase(environment), // Inyecta las credenciales de esta app
  ],
};
```

---

### 2. El Servicio (`SupabaseService` / `Supabase`)
* **Responsabilidad:** Es el cliente reactivo e interactivo consumido en el día a día por los componentes y servicios de la UI.
* **Convención Angular v22+:** Utiliza el decorador `@Service()` (sustituto ergonómico oficial de `@Injectable({ providedIn: 'root' })`).
* **Qué hace:**
  * Lee la configuración inyectada por el provider (`SUPABASE_CONFIG`).
  * Inicializa la instancia de `createClient` de Supabase detectando si corre en navegador o SSR.
  * Expone directamente los métodos y getters (`auth`, `storage`, `from()`, `channel()`) para que **no sea necesario escribir `.client` en ningún lado**.

```typescript
// En cualquier componente o servicio
import { Service, inject } from '@angular/core';

@Service()
export class CatalogoService {
  private readonly supabase = inject(SupabaseService);

  async obtenerProductos() {
    // Uso directo y limpio:
    return await this.supabase.from('products').select('*');
  }
}
```

---

## 📦 Modelos Exportados
* `Profile`: Modelo de la tabla `public.profiles`.
* `Permission`: Modelo de la tabla `public.permissions`.
* `Role`: Modelo de la tabla `public.roles`.
* `RolePermission`: Modelo de la tabla `public.role_permissions`.
* `UserRole`: Modelo de la tabla `public.user_roles`.
* `SecurityLog`: Modelo de la tabla `public.security_logs`.

---

## 💡 Decisiones de Diseño y Arquitectura (FAQ Técnico)

Para mantener la claridad del proyecto en futuras etapas, a continuación se resumen las 4 decisiones clave adoptadas en esta librería:

### 1. ¿Por qué sigue siendo necesario `provideSupabase` si usamos el decorador `@Service()`?
* `@Service()` (introducido en Angular v22+) define **cómo vive el servicio** en el árbol de inyección (singleton global autoprovisionado en `root`).
* Sin embargo, al ser una **librería compartida en Nx**, `libs/shared-auth` no puede ni debe importar los archivos `environment.ts` de una app en particular (violaría el aislamiento modular de Nx).
* `provideSupabase(environment)` actúa como el **puente**: cada aplicación (`storefront` y `backoffice`) le suministra sus credenciales en `app.config.ts`, y el provider las almacena en el token `SUPABASE_CONFIG` para que el servicio las consuma al inicializarse.

### 2. ¿Por qué la propiedad interna se llama `_client` con guión bajo?
* En TypeScript, una clase no puede definir una propiedad privada y un getter público con el mismo nombre (`private client` y `get client()`).
* Se decidió mantener el getter público `get client(): SupabaseClient` como un *escape-hatch* (vía de escape) en caso de necesitar invocar funcionalidades avanzadas de Supabase no envueltas directamente (e.g. `supabase.client.functions`, `supabase.client.schema()`).
* Por convención estándar, la variable privada interna se renombra con prefijo `_client`.

### 3. ¿Por qué condicionar la inicialización con `isPlatformBrowser` (`isBrowser`)?
* El proyecto `storefront` utiliza **Server-Side Rendering (Angular SSR)** con Node.js.
* En el servidor:
  1. `window.localStorage` no existe (evita excepciones o advertencias en tiempo de ejecución en el servidor).
  2. **Seguridad y privacidad:** Si el servidor Node.js retuviera las sesiones en memoria (`persistSession: true`), los datos de sesión de un usuario podrían filtrarse hacia peticiones de otros usuarios concurrentes.
* Con `{ persistSession: isBrowser, autoRefreshToken: isBrowser, detectSessionInUrl: isBrowser }`:
  - En el servidor Node.js (SSR) se ejecutan consultas públicas sin almacenamiento de sesión en disco ni memoria.
  - En el navegador del cliente (`isBrowser === true`) los tokens se almacenan y refrescan normalmente en `localStorage`.

### 4. ¿Por qué los getters tienen tipos de retorno explícitos (`SupabaseClient['auth']`, `ReturnType<...>`)?
* A diferencia de los servicios dentro de una aplicación común, las librerías de Nx compilan con `"declaration": true` en `tsconfig.lib.json` para generar archivos `.d.ts`.
* Cuando `"declaration": true` está activo, la regla **TS4094** de TypeScript prohíbe generar tipos anónimos inferidos si la clase subyacente contiene miembros privados o protegidos.
* Como las clases internas de Supabase (`GoTrueClient`, `StorageFileApi`, etc.) tienen decenas de propiedades privadas (`__loadSession`, `_acquireLock`, `_autoRefreshTokenTick`), la inferencia automática sin tipos provocaba más de 100 errores TS4094.
* Declarar explícitamente los tipos de retorno basados en la interfaz pública de `SupabaseClient` resuelve el problema y mantiene una compilación de tipos 100% limpia.

