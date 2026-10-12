-- ==============================================================================
-- MIGRACIÓN SUPABASE: CATÁLOGO REFINADO, OFERTAS Y TRAZABILIDAD
-- Fecha: 2026-10-11
-- ==============================================================================

-- 1. TABLA: PRODUCTOS (Actualización de columnas)
-- Remoción de campos directos de oferta en favor de 'offers' y 'offer_items'
ALTER TABLE public.products DROP COLUMN IF EXISTS sale_price;
ALTER TABLE public.products DROP COLUMN IF EXISTS sale_valid_from;
ALTER TABLE public.products DROP COLUMN IF EXISTS sale_valid_until;

-- Nuevos campos requeridos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS applies_discount BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS points_required INT8;

-- Asegurar tipos de precisión numérica
ALTER TABLE public.products ALTER COLUMN base_price TYPE NUMERIC(12, 2);
ALTER TABLE public.products ALTER COLUMN cost_price TYPE NUMERIC(12, 2);


-- 2. TABLA: DETALLE DE COMBOS (bundle_items)
-- Se preserva el nombre 'bundle_items' y la columna 'quantity'
CREATE TABLE IF NOT EXISTS public.bundle_items (
  bundle_id INT8 REFERENCES public.bundles(id) ON DELETE CASCADE NOT NULL,
  product_id INT8 REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INT2 DEFAULT 1 NOT NULL,
  PRIMARY KEY (bundle_id, product_id)
);

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bundle_items_select_public" ON public.bundle_items;
CREATE POLICY "bundle_items_select_public" 
ON public.bundle_items 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "bundle_items_all_staff" ON public.bundle_items;
CREATE POLICY "bundle_items_all_staff" 
ON public.bundle_items 
FOR ALL 
TO authenticated 
USING (public.is_staff_user());


-- 3. TABLA: CUPONES Y DESCUENTOS
-- Códigos opcionales (nullable) para admitir promociones automáticas y agregar 'name'
ALTER TABLE public.discounts ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE public.discounts SET name = COALESCE(name, code, 'Descuento') WHERE name IS NULL;
ALTER TABLE public.discounts ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.discounts ALTER COLUMN discount_percentage TYPE NUMERIC(5, 2);
ALTER TABLE public.discounts ALTER COLUMN fixed_discount TYPE NUMERIC(12, 2);
ALTER TABLE public.discounts ALTER COLUMN min_purchase_amount TYPE NUMERIC(12, 2);


-- 4. TABLA: OFERTAS (Campañas y promociones)
CREATE TABLE IF NOT EXISTS public.offers (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  logo_url TEXT,
  promotion_starts_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  discount_percentage NUMERIC(5, 2),
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_slug ON public.offers(slug);
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_validity ON public.offers(valid_from, valid_until);

-- RLS para offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_select_public" ON public.offers;
CREATE POLICY "offers_select_public" 
ON public.offers 
FOR SELECT 
USING (is_active = true OR public.is_staff_user());

DROP POLICY IF EXISTS "offers_all_staff" ON public.offers;
CREATE POLICY "offers_all_staff" 
ON public.offers 
FOR ALL 
TO authenticated 
USING (public.is_staff_user());


-- 5. TABLA: ÍTEMS DE OFERTAS (offer_items)
CREATE TABLE IF NOT EXISTS public.offer_items (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id INT8 REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
  product_id INT8 REFERENCES public.products(id) ON DELETE CASCADE,
  bundle_id INT8 REFERENCES public.bundles(id) ON DELETE CASCADE,
  price NUMERIC(12, 2),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  CONSTRAINT check_offer_item_target CHECK (
    (product_id IS NOT NULL AND bundle_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_offer_items_offer ON public.offer_items(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_items_product ON public.offer_items(product_id);
CREATE INDEX IF NOT EXISTS idx_offer_items_bundle ON public.offer_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_offer_items_active ON public.offer_items(is_active);

-- RLS para offer_items
ALTER TABLE public.offer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offer_items_select_public" ON public.offer_items;
CREATE POLICY "offer_items_select_public" 
ON public.offer_items 
FOR SELECT 
USING (is_active = true OR public.is_staff_user());

DROP POLICY IF EXISTS "offer_items_all_staff" ON public.offer_items;
CREATE POLICY "offer_items_all_staff" 
ON public.offer_items 
FOR ALL 
TO authenticated 
USING (public.is_staff_user());


-- 6. TABLA: PEDIDOS / ÓRDENES (Actualización de columnas y precisión)
-- discount_applied booleano para indicar si se aplicó descuento a la orden
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_applied BOOLEAN DEFAULT FALSE;
UPDATE public.orders SET discount_applied = (discount_id IS NOT NULL OR discount_amount > 0) WHERE discount_applied IS NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credit_used NUMERIC(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS final_paid_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL;
UPDATE public.orders SET final_paid_amount = total_amount WHERE final_paid_amount = 0 AND total_amount > 0;

ALTER TABLE public.orders ALTER COLUMN subtotal_amount TYPE NUMERIC(12, 2);
ALTER TABLE public.orders ALTER COLUMN discount_amount TYPE NUMERIC(12, 2);
ALTER TABLE public.orders ALTER COLUMN shipping_cost TYPE NUMERIC(12, 2);
ALTER TABLE public.orders ALTER COLUMN total_amount TYPE NUMERIC(12, 2);


-- 7. TABLA: DETALLE DE PEDIDOS (order_details - Trazabilidad y precisión)
ALTER TABLE public.order_details ADD COLUMN IF NOT EXISTS offer_item_id INT8 REFERENCES public.offer_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_order_details_offer_item ON public.order_details(offer_item_id);

ALTER TABLE public.order_details ADD COLUMN IF NOT EXISTS regular_price NUMERIC(12, 2);
UPDATE public.order_details SET regular_price = unit_price WHERE regular_price IS NULL;
ALTER TABLE public.order_details ALTER COLUMN regular_price SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_details' AND column_name = 'unit_cost'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_details' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE public.order_details RENAME COLUMN unit_cost TO cost_price;
  ELSE
    ALTER TABLE public.order_details ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

ALTER TABLE public.order_details ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
ALTER TABLE public.order_details ALTER COLUMN unit_price TYPE NUMERIC(12, 2);
ALTER TABLE public.order_details ALTER COLUMN subtotal TYPE NUMERIC(12, 2);


-- 8. TRIGGERS: CONTROL DE INVENTARIO CON bundle_items
CREATE OR REPLACE FUNCTION public.handle_order_item_stock_deduction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.item_type = 'bundle' AND NEW.bundle_id IS NOT NULL THEN
    -- Descontar el stock de cada producto integrante del bundle según bundle_items
    UPDATE public.products p
    SET stock = p.stock - (bi.quantity * NEW.quantity)
    FROM public.bundle_items bi
    WHERE bi.bundle_id = NEW.bundle_id AND bi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_order_cancellation_stock_restore()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR item IN
      SELECT * FROM public.order_details WHERE order_id = NEW.id
    LOOP
      IF item.item_type = 'product' AND item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock = stock + item.quantity
        WHERE id = item.product_id;
      ELSIF item.item_type = 'bundle' AND item.bundle_id IS NOT NULL THEN
        UPDATE public.products p
        SET stock = p.stock + (bi.quantity * item.quantity)
        FROM public.bundle_items bi
        WHERE bi.bundle_id = item.bundle_id AND bi.product_id = p.id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 9. PERMISOS Y ROLES PARA GESTIÓN DE OFERTAS
INSERT INTO public.permissions (code, name, module, description)
VALUES
  ('catalog.offers.view', 'Ver ofertas', 'catalog', 'Permite visualizar el listado de ofertas y promociones programadas'),
  ('catalog.offers.manage', 'Gestionar ofertas', 'catalog', 'Permite crear, editar y programar ofertas y sus productos')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description;

DO $$
DECLARE
  v_admin_role_id INT8;
  v_catalog_role_id INT8;
  v_column_name TEXT;
BEGIN
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'administrador';
  SELECT id INTO v_catalog_role_id FROM public.roles WHERE name = 'catalog_manager';

  SELECT column_name INTO v_column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND column_name IN ('rol_id', 'role_id')
  LIMIT 1;

  IF v_column_name IS NULL THEN
    v_column_name := 'role_id';
  END IF;

  IF v_column_name = 'rol_id' THEN
    INSERT INTO public.role_permissions (rol_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions WHERE code IN ('catalog.offers.view', 'catalog.offers.manage')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_permissions (rol_id, permission_id)
    SELECT v_catalog_role_id, id FROM public.permissions WHERE code IN ('catalog.offers.view', 'catalog.offers.manage')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions WHERE code IN ('catalog.offers.view', 'catalog.offers.manage')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_catalog_role_id, id FROM public.permissions WHERE code IN ('catalog.offers.view', 'catalog.offers.manage')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
