# Guía Rápida de Setup y Desarrollo - EcoTanti

Este documento resume los pasos ejecutados para la creación del workspace, configuración de librerías, inicialización de Nx y flujo de trabajo diario.

---

## 1. Inicialización del Workspace Multi-Proyecto

```bash
# 1. Contenedor base de Angular en el directorio actual
ng new ecotanti --no-create-application --directory=.

# 2. Aplicación Storefront (Clientes - con SSR para SEO)
ng generate application storefront --routing --style=css --ssr

# 3. Aplicación Backoffice (Administrador - SPA para PWA)
ng generate application backoffice --routing --style=css --ssr=false
```

---

## 2. Instalación de UI y Estilos (Optimus UI + Tailwind)

```bash
# Dependencias en la raíz
npm install @openng/optimus-ui @openng/optimus-ui-themes @openng/icons @openng/optimus-ui-tailwindcss
npm install -D tailwindcss postcss @tailwindcss/postcss autoprefixer
```

### Archivos de Configuración Aplicados:
* **`.postcssrc.json`** en la raíz:
  ```json
  {
    "plugins": {
      "@tailwindcss/postcss": {}
    }
  }
  ```
* **`styles.css`** (en `projects/storefront/src/styles.css` y `projects/backoffice/src/styles.css`):
  ```css
  @import "@openng/icons/openng-icons.css";
  @import "tailwindcss";
  @import "@openng/optimus-ui-tailwindcss";
  ```
* **Proveedores (`app.config.ts`)** en ambas aplicaciones:
  ```typescript
  import { provideOptimus } from '@openng/optimus-ui/config';
  import Aura from '@openng/optimus-ui-themes/aura';

  // En providers:
  provideOptimus({ theme: { preset: Aura } })
  ```

---

## 3. Inicialización y Configuración de Nx

```bash
# Agregar Nx al workspace existente
npx nx@latest init
# (Opciones: cachear 'build' y 'test', desmarcar 'serve', omitir Nx Cloud)
```

### Ajuste de Puertos en Monorepo:
* En `projects/backoffice/project.json` se configuró el puerto `4201` para el target `serve`:
  ```json
  "serve": {
    "executor": "@angular/build:dev-server",
    "options": {
      "port": 4201
    }
  }
  ```

---

## 4. Ejecución Simultánea y Desarrollo

### Correr ambos proyectos a la vez:
```bash
npm run dev
```
*(Equivale a `nx run-many -t serve`)*

* **Storefront:** [http://localhost:4200](http://localhost:4200)
* **Backoffice:** [http://localhost:4201](http://localhost:4201)

### Correr de forma individual:
```bash
npm run start:storefront   # Puerto 4200
npm run start:backoffice   # Puerto 4201
```

---

## 5. Hot Reload / Cambios en Tiempo Real (HMR)

**Sí, 100%.** 
Al correr `npm run dev`:
* Ambas aplicaciones están en modo **Live Reload / HMR (Hot Module Replacement)**.
* Cualquier cambio que guardes en archivos `.ts`, `.html` o `.css` se recompila en milisegundos y se refleja de inmediato en el navegador sin necesidad de reiniciar la terminal ni recargar manualmente la página.

