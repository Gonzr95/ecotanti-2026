# Instrucciones y Contexto del Proyecto EcoTanti

## Resumen del Proyecto
EcoTanti es un e-commerce desarrollado con arquitectura de Monorepo (Nx), compuesto por:
1. **Storefront (projects/storefront):** Angular con Server-Side Rendering (`@angular/ssr`) y Tailwind CSS para indexación SEO y OpenGraph.
2. **Backoffice (projects/backoffice):** Angular con **Optimus UI** (`@openng/optimus-ui`) y PWA (`@angular/pwa`) con soporte Offline-First mediante Dexie.js (IndexedDB).
3. **Librerías Compartidas (libs/ o projects/):** Modelos de TypeScript, auth y esquemas de validación compartidos.
4. **Backend & Base de Datos:** Supabase (PostgreSQL, Auth con RLS, Storage para imágenes). Esquema documentado en `especificaciones/DATABASE_SCHEMA.md`.
5. **Correos:** Resend / Nodemailer para confirmación transaccional de órdenes.

## Reglas de Arquitectura y Documentación
- Todas las especificaciones técnicas y de arquitectura deben ubicarse en la carpeta **`especificaciones/`** (ej: `especificaciones/AUTH_SPECIFICATION.md`, `especificaciones/DATABASE_SCHEMA.md`).
- Para estándares y desarrollo de entidades ABM/CRUD con Signals, consultar [`.gemini/entity_crud_guidelines.md`](./entity_crud_guidelines.md).
- Para convenciones de UI, componentes, estilos y providers con Optimus UI, consultar [`.gemini/optimus_ui_guidelines.md`](./optimus_ui_guidelines.md).

## Librería de UI: Optimus UI
- Este proyecto utiliza **Optimus UI** (`@openng/optimus-ui`), fork comunitario de PrimeNG.
- Índice de documentación para IA: `https://optimus.openng.org/llms/llms.txt`
- Endpoints de componentes en Markdown: `https://optimus.openng.org/llms/components/<componente>.md`
- Al implementar componentes en el Backoffice, consultar siempre estos endpoints y respetar [`.gemini/optimus_ui_guidelines.md`](./optimus_ui_guidelines.md).

## Decisiones Técnicas Críticas
- **Base de Datos y RLS Obligatorio:** Toda tabla creada o modificada en Supabase debe contar con sus políticas de Row Level Security (RLS) explícitas:
  1. `SELECT`: Definir permisos de lectura para usuarios anónimos o autenticados (e.g. `auth.uid() = user_id`). Recordar que sin política de SELECT, PostgreSQL devuelve 0 filas (`[]`) silenciosamente.
  2. `INSERT`: Autorizar explícitamente inserciones desde el cliente (e.g. `security_logs`, pedidos, carritos).
  3. `UPDATE / DELETE`: Restringir por propiedad del registro o por roles validados en `user_roles`.
- **Mercado Pago (Fase 2):** En el MVP no se procesan cobros automáticos. El checkout se gestiona por Transferencia Bancaria (CBU/Alias) y WhatsApp. Mercado Pago queda visible como "(Próximamente)".
- **Logística y Facturación AFIP:** La base de datos deja los campos desacoplados y preparados para futuras integraciones.
- **Offline-First en Backoffice:** Los productos creados sin conexión usan UUIDs generados en el cliente y se encolan en IndexedDB (Outbox Pattern) para sincronizarse automáticamente al detectar red.
- **Lazy Loading Mandatorio en Backoffice:** Todos los componentes y pantallas desarrollados para el Backoffice deben cargarse con lazy loading (`loadComponent: () => import(...)` en rutas y `@defer` para subcomponentes diferidos/modales).
- **Feedback Visual con Skeleton & Spinners:** Toda vista que consulte datos asíncronos o ejecute mutaciones debe implementar estados de carga visual: `<p-skeleton>` para listados/tablas/cards (evitando layout shifts) y botones con `[loading]` / spinners para acciones de guardado y transiciones (ver [`.gemini/optimus_ui_guidelines.md`](./optimus_ui_guidelines.md)).
- **Despliegue inicial:** Backoffice en Firebase Hosting ($0). Storefront en Firebase App Hosting / Vercel o Home Server vía Cloudflare Tunnel.

Para detalles exhaustivos de arquitectura general y marco legal argentino, referirse a `ARCHITECTURE.md`.
Para la especificación completa del sistema de autenticación, modelo RBAC granular y auditoría, referirse a `especificaciones/AUTH_SPECIFICATION.md`.

