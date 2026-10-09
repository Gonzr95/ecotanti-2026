# Instrucciones y Contexto del Proyecto EcoTanti

## Resumen del Proyecto
EcoTanti es un e-commerce desarrollado con arquitectura de Monorepo (Nx), compuesto por:
1. **Storefront (apps/storefront):** Angular con Server-Side Rendering (`@angular/ssr`) y Tailwind CSS para indexación SEO y OpenGraph.
2. **Backoffice (apps/backoffice):** Angular con **Optimus UI** (`@openng/optimus-ui`) y PWA (`@angular/pwa`) con soporte Offline-First mediante Dexie.js (IndexedDB).
3. **Librerías Compartidas (libs/shared-types, libs/shared-validators):** Modelos de TypeScript y esquemas de validación compartidos.
4. **Backend & Base de Datos:** Supabase (PostgreSQL, Auth con RLS, Storage para imágenes). *Nota: La estructura de tablas está pendiente de definición.*
5. **Correos:** Resend / Nodemailer para confirmación transaccional de órdenes.

## Librería de UI: Optimus UI
- Este proyecto utiliza **Optimus UI** (`@openng/optimus-ui`), fork comunitario de PrimeNG.
- Índice de documentación para IA: `https://optimus.openng.org/llms/llms.txt`
- Endpoints de componentes en Markdown: `https://optimus.openng.org/llms/components/<componente>.md`
- Al implementar componentes en el Backoffice, consultar siempre estos endpoints para obtener sintaxis y directivas actualizadas.

## Decisiones Técnicas Críticas
- **Base de Datos:** Estructura de tablas y esquemas **pendiente de confirmación**. No asumir esquemas fijos de tablas hasta que sean definidos expresamente.
- **Mercado Pago (Fase 2):** En el MVP no se procesan cobros automáticos. El checkout se gestiona por Transferencia Bancaria (CBU/Alias) y WhatsApp. Mercado Pago queda visible como "(Próximamente)".
- **Logística y Facturación AFIP:** La base de datos deja los campos desacoplados y preparados para futuras integraciones.
- **Offline-First en Backoffice:** Los productos creados sin conexión usan UUIDs generados en el cliente y se encolan en IndexedDB (Outbox Pattern) para sincronizarse automáticamente al detectar red.
- **Despliegue inicial:** Backoffice en Firebase Hosting ($0). Storefront en Firebase App Hosting / Vercel o Home Server vía Cloudflare Tunnel.

Para detalles exhaustivos de tablas SQL, flujos y marco legal argentino (Ley 25.326 y Botón de Arrepentimiento Ley 24.240), referirse a `ARCHITECTURE.md`.

