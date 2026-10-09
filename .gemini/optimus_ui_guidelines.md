# Guía de Estilo y Convenciones de Optimus UI

> **Librería de Componentes:** Optimus UI (`@openng/optimus-ui`), fork comunitario de PrimeNG.  
> **Iconos:** `@openng/icons` (`pi pi-<nombre>`).  
> **Estilos:** Tailwind CSS v4 + `@openng/optimus-ui-tailwindcss`.  
> **Tema Activo:** Aura (`@openng/optimus-ui-themes/aura`).

---

## 1. Referencias Oficiales para IA
* **Índice general de documentación:** `https://optimus.openng.org/llms/llms.txt`
* **Endpoints de componentes en Markdown:** `https://optimus.openng.org/llms/components/<componente>.md`
  *(Ejemplo: `https://optimus.openng.org/llms/components/table.md`, `https://optimus.openng.org/llms/components/button.md`)*

---

## 2. Reglas de Importación de Componentes

En Optimus UI existen dos modalidades de importación según la complejidad del componente:

### A. Componentes Complejos (Requieren Importación como `NgModule`)
Componentes que poseen múltiples directivas internas y subcomponentes (`standalone: false` internamente):
```typescript
import { TableModule } from '@openng/optimus-ui/table';
import { ToastModule } from '@openng/optimus-ui/toast';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
```

### B. Componentes Standalone (Importación Directa)
Componentes atómicos que pueden importarse individualmente en el array `imports: [...]`:
```typescript
import { Button } from '@openng/optimus-ui/button';           // o ButtonModule de @openng/optimus-ui/button
import { InputText } from '@openng/optimus-ui/inputtext';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { Tag } from '@openng/optimus-ui/tag';                 // o TagModule de @openng/optimus-ui/tag
import { Card } from '@openng/optimus-ui/card';               // o CardModule de @openng/optimus-ui/card
```

---

## 3. Providers Locales para Notificaciones y Diálogos

Cualquier vista o componente que aloje `<p-toast>` o `<p-confirmdialog>` **debe proveer explícitamente sus servicios** en el decorador `@Component`:

```typescript
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';

@Component({
  selector: 'app-mi-vista',
  imports: [ToastModule, ConfirmDialogModule, ...],
  providers: [MessageService, ConfirmationService],
  ...
})
export class MiVistaComponent {
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
}
```

---

## 4. Corrección Global de Animaciones (Glitch en Modales y Drawers)

Para evitar que los Diálogos o Drawers parpadeen o reaparezcan por un milisegundo durante el desmontaje de Angular al cerrarse, se asegura la siguiente regla en el CSS global (`styles.css`):

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

---

## 5. Patrones UX de Interfaz de Usuario

| Caso de Uso | Patrón Recomendado | Implementación |
| :--- | :--- | :--- |
| **Pocos campos** (Nombre, código, descripción breve) | **Patrón Inline:** Quick-Add en barra superior + Edición en fila de tabla con teclas `Enter` / `Esc`. | Campos rápidos con `InputText` y botones de acción en tabla. |
| **Múltiples campos / Formularios extensos** (Precios, relaciones, fotos, roles) | **Patrón Modal / Dialog:** Diálogo emergente con validaciones reactivas. | `<p-dialog>` con `<form>` reactivo y mensajes de error controlados. |

---

## 6. Iconografía
* Usar siempre clases con el prefijo `pi pi-<nombre>` de `@openng/icons`.
* Ejemplos habituales:
  * Guardar / Éxito: `pi pi-check`
  * Eliminar / Peligro: `pi pi-trash`
  * Editar: `pi pi-pencil`
  * Advertencia: `pi pi-exclamation-triangle`
  * Búsqueda: `pi pi-search`
  * Sincronizar: `pi pi-sync`

