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
- **Base de Datos:** Estructura oficial documentada en `especificaciones/DATABASE_SCHEMA.md`.
- **Mercado Pago (Fase 2):** En el MVP no se procesan cobros automáticos. El checkout se gestiona por Transferencia Bancaria (CBU/Alias) y WhatsApp. Mercado Pago queda visible como "(Próximamente)".
- **Logística y Facturación AFIP:** La base de datos deja los campos desacoplados y preparados para futuras integraciones.
- **Offline-First en Backoffice:** Los productos creados sin conexión usan UUIDs generados en el cliente y se encolan en IndexedDB (Outbox Pattern) para sincronizarse automáticamente al detectar red.
- **Despliegue inicial:** Backoffice en Firebase Hosting ($0). Storefront en Firebase App Hosting / Vercel o Home Server vía Cloudflare Tunnel.

Para detalles exhaustivos de arquitectura general y marco legal argentino, referirse a `ARCHITECTURE.md`.
Para la especificación completa del sistema de autenticación, modelo RBAC granular y auditoría, referirse a `especificaciones/AUTH_SPECIFICATION.md`.

