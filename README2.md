# EcoTanti - E-Commerce Platform

Plataforma de comercio electrónico compuesta por dos aplicaciones principales: un **Storefront público con SEO** para clientes y un **Backoffice administrativo PWA con soporte offline-first** para gestión del catálogo, pedidos y configuraciones.

---

## 📌 Documentación del Proyecto

Para conocer todos los detalles de diseño, arquitectura, modelo de base de datos, marco legal y estrategia de despliegue, consulta el documento principal:

👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## 🚀 Resumen del Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Monorepo** | **Nx** | Orquestación de aplicaciones y librerías compartidas (tipos, validadores). |
| **Storefront (B2C)** | **Angular + SSR + Tailwind CSS** | Tienda pública, catálogo, landing page, indexación SEO y OpenGraph. |
| **Backoffice (Admin)** | **Angular + Optimus UI (`@openng/optimus-ui`) + PWA** | Panel de control, componentes de datos, responsive móvil, modo offline. |
| **Persistencia Local** | **Dexie.js (IndexedDB)** | Soporte offline-first para carga de productos sin conexión en el admin. |
| **Base de Datos & Auth** | **Supabase (PostgreSQL)** | RLS (Row Level Security), Auth (roles admin/cliente), Storage (fotos). |
| **Correos** | **Resend / Nodemailer** | Mails transaccionales de confirmación de pedidos. |
| **Pagos (MVP)** | **Transferencia / WhatsApp** | Checkout con datos bancarios (Mercado Pago preparado para fase 2). |

---

## 🏢 Estructura del Monorepo

```text
ecotanti/
├── apps/
│   ├── storefront/         # Tienda Angular con Server-Side Rendering (SSR)
│   └── backoffice/         # Panel de gestión Angular PWA + PrimeNG
├── libs/
│   ├── shared-types/       # Modelos e interfaces TypeScript compartidas
│   └── shared-validators/  # Reglas de validación comunes
├── ARCHITECTURE.md         # Especificación técnica y legal completa
└── README.md
```

