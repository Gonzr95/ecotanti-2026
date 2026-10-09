# Especificación de Arquitectura - EcoTanti E-Commerce

Este documento define las bases técnicas, decisiones de diseño, modelo de base de datos, estrategia offline y consideraciones legales para el desarrollo del proyecto **EcoTanti**.

---

## 1. Visión General del Sistema

El sistema es una solución de comercio electrónico modular dividida en dos aplicaciones independientes organizadas bajo un **Monorepo (Nx)**:

1. **Storefront (B2C - Clientes):**
   * Landing page y catálogo de productos optimizado para motores de búsqueda (**SEO**) y redes sociales (OpenGraph tags).
   * Cuentas de usuario para almacenar direcciones y agilizar compras futuras.
   * Proceso de checkout claro y simple.
   * Envío automático de correos transaccionales tras la compra.
   * **Fase MVP:** Pagos mediante transferencia bancaria y coordinación por WhatsApp. Opción de Mercado Pago señalizada como *(Próximamente)*.

2. **Backoffice (B2B - Administración del Negocio):**
   * Panel de control para gestionar catálogo, ofertas, stock, pedidos y configuraciones del negocio (alias bancario, WhatsApp, etc.).
   * Enfoque **PWA (Progressive Web App)** instalable en dispositivos móviles (Android/iOS) sin depender de tiendas de aplicaciones.
   * **Offline-First:** Capacidad de operar y crear productos sin conexión a internet, sincronizándose automáticamente al restablecer la red.

---

## 2. Stack Tecnológico

```
                                +---------------------------+
                                |      Monorepo (Nx)        |
                                +-------------+-------------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
       [apps/storefront]                                         [apps/backoffice]
    Angular + SSR + Tailwind                              Angular + Optimus UI + PWA
   (SEO, OpenGraph, Hydration)                             (Offline Dexie.js, Outbox Sync)
                   \                                                     /
                    \                                                   /
                     +--------------------+----------------------------+
                                          |
                                   [libs/shared-types]
                              Interfaces & DTOs TypeScript
                                          |
                      +-------------------+-------------------+
                      |                                       |
           [Supabase Cloud (Postgres)]                [Servicios Auxiliares]
          - Auth (Admin / Customer RLS)               - Resend / Nodemailer (Emails)
          - Storage (Imágenes de productos)           - Hosting: Firebase (Backoffice)
          - Realtime (Alertas de pedidos)             - Hosting: Home Server / Vercel (Storefront)
```

| Capa | Herramienta / Framework | Justificación |
| :--- | :--- | :--- |
| **Workspace** | **Nx** | Gestión de monorepo; soporte nativo para Angular y compartición de librerías de tipos. |
| **Storefront** | **Angular + `@angular/ssr` + Tailwind CSS** | Renderizado del lado del servidor (SSR) para SEO e indexación social. Diseño rápido y mobile-first con Tailwind. |
| **Backoffice** | **Angular + Optimus UI (`@openng/optimus-ui`) + `@angular/pwa`** | Fork comunitario de PrimeNG. Componentes de datos avanzados, accesibilidad y PWA para instalación móvil. |
| **Persistencia Offline** | **Dexie.js (IndexedDB)** | Almacenamiento local en el navegador del administrador para soporte offline y cola de mutaciones. |
| **Base de Datos & Auth** | **Supabase (PostgreSQL)** | Autenticación con Row Level Security (RLS), almacenamiento de imágenes (Storage) y eventos Realtime. |
| **Emails** | **Resend / Nodemailer** | Mails transaccionales de confirmación de órdenes. |
| **Despliegue** | **Firebase Hosting** *(Backoffice)* + **Home Server / PaaS** *(Storefront)* | Infraestructura de costo $0 USD/mes para la etapa inicial. |

### Documentación de Optimus UI para IA
* **Índice LLMs:** `https://optimus.openng.org/llms/llms.txt`
* **Endpoints de componentes en Markdown:** `https://optimus.openng.org/llms/components/<componente>.md`

---

## 3. Estrategia Offline-First en el Backoffice

Para garantizar que el administrador pueda cargar productos o consultar información en zonas sin cobertura o con mala señal:

### Arquitectura de Sincronización (Outbox Pattern)
1. **Almacenamiento Local (IndexedDB con Dexie.js):**
   * El navegador mantiene réplicas locales de las tablas clave: `local_products` y `sync_queue`.
2. **Generación de IDs en el Cliente:**
   * Al crear un producto offline, se genera un **UUID v4** en el cliente. Esto previene colisiones de identificadores numéricos al sincronizar con Postgres.
3. **Manejo de Imágenes Offline:**
   * Las fotos tomadas con la cámara o cargadas desde el dispositivo se almacenan temporalmente como `Blob` en IndexedDB.
4. **Cola de Mutaciones (`sync_queue`):**
   * Cada acción offline se registra con la siguiente estructura:
     ```typescript
     interface SyncQueueItem {
       id: string;
       action: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT';
       entityId: string;
       payload: any;
       imageBlobs?: Blob[];
       timestamp: number;
       status: 'pending' | 'syncing' | 'failed';
     }
     ```
5. **Detector de Red y Proceso en Segundo Plano:**
   * La aplicación escucha eventos `online` del navegador (`window.addEventListener('online', ...)`).
   * Al recuperar la conexión, se procesa la cola:
     1. Si hay imágenes pendientes, se suben a **Supabase Storage** y se obtienen sus URLs públicas.
     2. Se ejecuta la inserción o actualización en la tabla de Supabase.
     3. Se limpia el elemento de `sync_queue` y se actualiza el estado en la UI de 🟡 *Sin sincronizar* a 🟢 *Sincronizado*.

---

## 4. Base de Datos (Supabase / PostgreSQL)

> [!NOTE]
> **Estado:** Estructura de tablas y esquema relacional **pendiente de definición y confirmación**.
> Se modelará en una etapa posterior acorde a las necesidades precisas del catálogo, pedidos y reglas de negocio.
> Se utilizará PostgreSQL en Supabase con Row Level Security (RLS) y almacenamiento para imágenes.

---

## 5. Marco Legal y Cumplimiento Normativo (Argentina)

Para operar de forma legal en la República Argentina, el sitio debe implementar las siguientes medidas:

### A. Ley de Protección de Datos Personales (Ley 25.326)
1. **Inscripción de Bases de Datos:**
   * Obligación de inscribir la base de datos de usuarios/clientes ante la **AAIP (Agencia de Acceso a la Información Pública)** mediante TAD (Trámites a Distancia).
2. **Consentimiento y Política de Privacidad:**
   * La tienda debe incluir una Política de Privacidad accesible que explique qué datos se recopilan, con qué finalidad y que no serán comercializados.
3. **Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):**
   * Canal visible para que cualquier usuario pueda solicitar la baja o modificación de sus datos almacenados.
4. **Leyenda Obligatoria de la AAIP:**
   * Debe mostrarse en el pie de página o formulario de registro la fórmula regulatoria correspondiente al órgano de control.

### B. Ley de Defensa del Consumidor (Ley 24.240 y Resoluciones)
1. **Botón de Arrepentimiento (Resolución 424/2020):**
   * Enlace visible y de fácil acceso en la página principal (Home) que permita solicitar la revocación de la compra dentro de los **10 días corridos** posteriores a la entrega del producto.
2. **Claridad de Precios:**
   * Todos los precios mostrados deben ser finales con IVA incluido.

---

## 6. Estrategia de Despliegue e Infraestructura ($0 Cost)

* **Backoffice:** Desplegado en **Firebase Hosting**. Provee CDN global, HTTP/2, certificado SSL gratuito y soporte nativo para el Service Worker de la PWA.
* **Storefront:** Desplegado con SSR en **Firebase App Hosting / Vercel** o en **Home Server** con Nginx + PM2 expuesto de forma segura mediante **Cloudflare Tunnels**.
* **Base de Datos y Auth:** **Supabase Cloud (Free Tier)** (500 MB base de datos, 1 GB storage de fotos, 50k usuarios activos).
* **Mails Transaccionales:** **Resend** (3.000 emails gratuitos mensuales).

