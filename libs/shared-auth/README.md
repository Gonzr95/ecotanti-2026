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
* **Qué hace:**
  * Lee la configuración inyectada por el provider.
  * Inicializa la instancia de `createClient` de Supabase detectando si corre en navegador o SSR.
  * Expone directamente los métodos y getters (`auth`, `storage`, `from()`, `channel()`) para que **no sea necesario escribir `.client` en ningún lado**.

```typescript
// En cualquier componente o servicio
export class CatalogoService {
  private readonly supabase = inject(SupabaseService);

  async obtenerProductos() {
    // Uso directo y limpio:
    return await this.supabase.from('products').select('*');
  }

  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
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
