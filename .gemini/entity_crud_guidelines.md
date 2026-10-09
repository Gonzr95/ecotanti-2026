# Guía Estándar de Implementación End-to-End para Entidades ABM / CRUD
> **Stack Tecnológico:** Angular 19/20+ (Signals & Standalone), Optimus UI (OpenNG / PrimeNG fork), Tailwind CSS, Supabase (PostgreSQL + RLS), Vitest.

Este documento establece el estándar de arquitectura, diseño y desarrollo para implementar nuevas entidades y componentes en el  proyecto. Cada entidad debe seguir rigurosamente estas 6 fases de trabajo para garantizar consistencia, seguridad, rendimiento y facilidad de mantenimiento.

---

## Índice de Fases

1. [Scripts de Base de Datos y Políticas RLS (Supabase)](#1-scripts-de-base-de-datos-y-políticas-rls-supabase)
2. [Servicio Reactivo con Signals](#3-servicio-reactivo-con-signals)
3. [Componente UI y Experiencia de Usuario (Optimus UI + Tailwind)](#4-componente-ui-y-experiencia-de-usuario-optimus-ui--tailwind)
4. [Rutas, Metadatos y Navegación Dinámica](#5-rutas-metadatos-y-navegación-dinámica)
5. [Verificación, Pruebas Unitarias y Calidad](#6-verificación-pruebas-unitarias-y-calidad)

---

## 1. Scripts de Base de Datos y Políticas RLS (Supabase)

Toda tabla administrada debe contar con **Row Level Security (RLS)** activado para proteger la integridad de los datos.

### Reglas de Seguridad
- **Lectura (SELECT):** 
- **Escritura (INSERT, UPDATE, DELETE):** 

### Plantilla SQL de Migración (`supabase/migrations/<entidad>_rls_policies.sql`)

```sql
-- ==============================================================================
-- Políticas de Seguridad a Nivel de Fila (RLS) para la tabla '<nombre_tabla>'
-- Base de Datos: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE public.<nombre_tabla> ENABLE ROW LEVEL SECURITY;

-- 2. Política de LECTURA (SELECT): Acceso público
DROP POLICY IF EXISTS "<nombre_tabla>_select_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_select_policy"
ON public.<nombre_tabla>
FOR SELECT
USING (true);

-- 3. Política de INSERCIÓN (INSERT): (si corresponde - revisar la parte de empleados)
DROP POLICY IF EXISTS "<nombre_tabla>_insert_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_insert_policy"
ON public.<nombre_tabla>
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);

-- 4. Política de ACTUALIZACIÓN (UPDATE): (si corresponde - revisar la parte de empleados)
DROP POLICY IF EXISTS "<nombre_tabla>_update_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_update_policy"
ON public.<nombre_tabla>
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);

-- 5. Política de ELIMINACIÓN (DELETE): (si corresponde - revisar la parte de empleados)
DROP POLICY IF EXISTS "<nombre_tabla>_delete_policy" ON public.<nombre_tabla>;
CREATE POLICY "<nombre_tabla>_delete_policy"
ON public.<nombre_tabla>
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users."userType" = 'employee'
  )
);
```

### Convenciones de Auditoría en Tablas

---

## 2. Servicio Reactivo con Signals

Los servicios encapsulan toda la comunicación con Supabase y exponen su estado mediante **Angular Signals**.

### Requerimientos Funcionales
1. **Inyección moderna:** Uso de `inject(...)`.
2. **Estado reactivo expuesto:**
   - `readonly items = signal<MyEntity[]>([]);`
   - `readonly loading = signal<boolean>(false);`
   - `readonly error = signal<string | null>(null);`
3. **Generador de Slugs:** Sanitización de caracteres acentuados con `normalize('NFD')` y reemplazo de símbolos no alfanuméricos por guiones.
4. **Resolución de Nombres de Auditoría (`modifiedByName`):**
   - Extrae los `modifiedBy_userId` únicos.
   - Consulta los nombres en lote contra `public.users` (`firstName`, `lastName`).
   - Resuelve el usuario en sesión actual como fallback si coincide el ID.
   - Si no hay usuario asociado, asigna `'Sistema'` o un identificador truncado.
5. **Actualización inmutable de señales:** Los métodos `create`, `update` y `delete` actualizan la señal local (`items.update(...)`) sin obligar a un refetch completo si la operación fue exitosa.

### Plantilla de Servicio Reactivo


---

## 3. Componente UI y Experiencia de Usuario (Optimus UI + Tailwind)

### Reglas Clave de Importación en Optimus UI
Para consultar la lista completa de componentes (NgModules vs Standalone), providers y patrones UX, referirse a:
👉 [`.gemini/optimus_ui_guidelines.md`](./optimus_ui_guidelines.md)

### Providers Locales
El componente que aloje `<p-toast>` y `<p-confirmdialog>` debe proveer sus servicios correspondientes en el decorador:
```typescript
@Component({
  ...
  providers: [MessageService, ConfirmationService],
})
```

### Elección del Patrón UX según la Complejidad

| Caso de Uso | Patrón Recomendado | Ejemplo en el Proyecto |
|---|---|---|
| **Pocos campos** (Nombre, descripción breve, slug) | **Patrón Inline:** Quick-Add en barra superior + Edición en fila de tabla con teclas `Enter` / `Esc`. | Formatos, Géneros |
| **Múltiples campos** (Precio, coordenadas, estados, relaciones) | **Patrón Modal:** Diálogo emergente con validaciones reactivas y confirmación de creación consecutiva ("¿Desea agregar otro?"). | Tipos de Asientos |

### Corrección Global del Glitch de Animaciones en Modales / Drawers
Para evitar que los Drawers o Diálogos reaparezcan por un milisegundo durante el desmontaje de Angular, asegurar en `src/styles.css`:
```css
.p-drawer-leave-left,
.p-drawer-leave-right,
.p-drawer-leave-top,
.p-drawer-leave-bottom,
.p-drawer-leave-full,
.p-dialog-leave-active,
.p-overlay-mask-leave-active {
  animation-fill-mode: forwards !important;
}
```

### Plantilla de Componente Inline (TypeScript)


---
---

## 6. Verificación, Pruebas Unitarias y Calidad

Toda nueva entidad debe incluir su suite de pruebas unitarias (`.spec.ts`) ejecutada con Vitest y pasar la compilación de producción con cero errores.

### Reglas Clave para Pruebas Unitarias con Optimus UI
1. **Mocking del Servicio Reactivo:** Simular los métodos asíncronos y exponer señales reactivas simuladas (`signal([])`, `signal(false)`).
2. **OverrideComponent y Servicios:** Debido a que el componente declara `providers: [MessageService, ConfirmationService]`, en el test se debe usar `.overrideComponent()` para suministrar el mock del servicio de la entidad conservando `ConfirmationService` y `MessageService` reales.
3. **Manejo de ConfirmationService:** Se deben espiar (`vi.spyOn(service, 'confirm')`) instancias reales obtenidas del inyector para evitar roturas en el constructor de `<p-confirmdialog>`.

### Suite de Pruebas Tipo (`my-entity.spec.ts`)

completar esto

### Comandos de Verificación
completar esto

---

## Resumen del Checklist para Nuevas Entidades

- [ ] **1. Supabase SQL:** Archivo en `supabase/migrations/<entidad>_rls_policies.sql` con SELECT público y INSERT/UPDATE/DELETE solo para empleados.
- [ ] **2. Servicio:** `src/app/features/backoffice/services/<entidad>.ts` con `signals`, `loadAll`, `create`, `update`, `delete`, resolución de usuarios y slugifier.
- [ ] **3. Componente UI:** `src/app/features/backoffice/views/<entidad>/` con Optimus UI + Tailwind, Quick-Add + Inline o Modal, `p-toast` y `p-confirmdialog`.
- [ ] **4. Calidad:** Pruebas unitarias en `.spec.ts` con Vitest y compilación `npm run build` limpia.
