-- ==============================================================================
-- MIGRACIÓN SUPABASE: CATÁLOGO, COMBOS, INVENTARIO, PEDIDOS Y ENVÍOS
-- ==============================================================================

-- 1. TABLA: CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 2. TABLA: MARCAS
CREATE TABLE IF NOT EXISTS public.brands (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 3. TABLA: PRODUCTOS (Inventario simple de unidades)
CREATE TABLE IF NOT EXISTS public.products (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2) NOT NULL,
  sale_price NUMERIC(12, 2),
  cost_price NUMERIC(12, 2),
  stock INT8 DEFAULT 0 NOT NULL,
  category_id INT8 REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id INT8 REFERENCES public.brands(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_highlight BOOLEAN DEFAULT FALSE NOT NULL,
  is_on_sale BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 4. TABLA: COMBOS / BUNDLES
CREATE TABLE IF NOT EXISTS public.bundles (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  total_price NUMERIC(12, 2) NOT NULL,
  discount_percentage NUMERIC(5, 2),
  images TEXT[] DEFAULT '{}' NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 5. TABLA: DETALLE DE COMBOS (Relación de productos que componen el combo)
CREATE TABLE IF NOT EXISTS public.bundle_items (
  bundle_id INT8 REFERENCES public.bundles(id) ON DELETE CASCADE NOT NULL,
  product_id INT8 REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INT2 DEFAULT 1 NOT NULL,
  PRIMARY KEY (bundle_id, product_id)
);

-- 6. TABLA: CUPONES DE DESCUENTO
CREATE TABLE IF NOT EXISTS public.discounts (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_percentage NUMERIC(5, 2),
  fixed_discount NUMERIC(12, 2),
  category_id INT8 REFERENCES public.categories(id) ON DELETE SET NULL,
  min_purchase_amount NUMERIC(12, 2),
  max_uses INT8,
  uses_count INT8 DEFAULT 0 NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 7. TABLA: PEDIDOS / ÓRDENES (Soporta usuarios registrados e invitados)
CREATE TABLE IF NOT EXISTS public.orders (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable para compra como invitado
  status TEXT DEFAULT 'pending' NOT NULL,
  subtotal_amount NUMERIC(12, 2) NOT NULL,
  discount_id INT8 REFERENCES public.discounts(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  shipping_cost NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer' NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  CONSTRAINT check_order_status CHECK (
    status IN ('pending', 'paid', 'preparing', 'shipped', 'ready_for_pickup', 'delivered', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 8. TABLA: ÍTEMS DEL PEDIDO (Valores congelados)
CREATE TABLE IF NOT EXISTS public.order_details (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INT8 REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id INT8 REFERENCES public.products(id) ON DELETE SET NULL,
  bundle_id INT8 REFERENCES public.bundles(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL, -- 'product' o 'bundle'
  item_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  unit_cost NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  quantity INT2 DEFAULT 1 NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  CONSTRAINT check_item_type CHECK (item_type IN ('product', 'bundle'))
);

CREATE INDEX IF NOT EXISTS idx_order_details_order ON public.order_details(order_id);

-- 9. TABLA: DESTINATARIO Y ENVÍO (Satélite 1 a 1 de la orden)
CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id INT8 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INT8 UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_dni TEXT,
  shipping_method TEXT NOT NULL, -- 'pickup', 'local_delivery', 'national_shipping'
  shipping_cost NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  address_line TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  notes TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON public.order_deliveries(order_id);


-- ==============================================================================
-- FUNCIONES Y TRIGGERS PARA CONTROL DE INVENTARIO
-- ==============================================================================

-- Función auxiliar para verificar si el usuario actual tiene rol staff
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Descontar stock al insertar un ítem en la orden
CREATE OR REPLACE FUNCTION public.handle_order_item_stock_deduction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.item_type = 'bundle' AND NEW.bundle_id IS NOT NULL THEN
    -- Descontar el stock dinámico de cada producto integrante del bundle
    UPDATE public.products p
    SET stock = p.stock - (bi.quantity * NEW.quantity)
    FROM public.bundle_items bi
    WHERE bi.bundle_id = NEW.bundle_id AND bi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_stock ON public.order_details;
CREATE TRIGGER trigger_deduct_stock
AFTER INSERT ON public.order_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_item_stock_deduction();

-- Trigger: Reintegrar stock si una orden se cancela
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

DROP TRIGGER IF EXISTS trigger_restore_stock ON public.orders;
CREATE TRIGGER trigger_restore_stock
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_cancellation_stock_restore();


-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Categorías
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT USING (is_active = true OR public.is_staff_user());
CREATE POLICY "categories_all_staff" ON public.categories FOR ALL TO authenticated USING (public.is_staff_user());

-- Marcas
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_select_public" ON public.brands FOR SELECT USING (is_active = true OR public.is_staff_user());
CREATE POLICY "brands_all_staff" ON public.brands FOR ALL TO authenticated USING (public.is_staff_user());

-- Productos
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (is_active = true OR public.is_staff_user());
CREATE POLICY "products_all_staff" ON public.products FOR ALL TO authenticated USING (public.is_staff_user());

-- Combos
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles_select_public" ON public.bundles FOR SELECT USING (is_active = true OR public.is_staff_user());
CREATE POLICY "bundles_all_staff" ON public.bundles FOR ALL TO authenticated USING (public.is_staff_user());

-- Ítems de combos
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundle_items_select_public" ON public.bundle_items FOR SELECT USING (true);
CREATE POLICY "bundle_items_all_staff" ON public.bundle_items FOR ALL TO authenticated USING (public.is_staff_user());

-- Cupones de descuento
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discounts_select_public" ON public.discounts FOR SELECT USING (is_active = true OR public.is_staff_user());
CREATE POLICY "discounts_all_staff" ON public.discounts FOR ALL TO authenticated USING (public.is_staff_user());

-- Pedidos (Orders)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_insert_anyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_select_owner_or_staff" ON public.orders FOR SELECT USING (
  public.is_staff_user() OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);
CREATE POLICY "orders_update_staff" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff_user());

-- Detalle de Pedidos (Order Details)
ALTER TABLE public.order_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_details_insert_anyone" ON public.order_details FOR INSERT WITH CHECK (true);
CREATE POLICY "order_details_select_owner_or_staff" ON public.order_details FOR SELECT USING (
  public.is_staff_user() OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_details.order_id AND o.user_id = auth.uid()
  )
);
CREATE POLICY "order_details_update_staff" ON public.order_details FOR UPDATE TO authenticated USING (public.is_staff_user());

-- Envíos de Pedidos (Order Deliveries)
ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_deliveries_insert_anyone" ON public.order_deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "order_deliveries_select_owner_or_staff" ON public.order_deliveries FOR SELECT USING (
  public.is_staff_user() OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_deliveries.order_id AND o.user_id = auth.uid()
  )
);
CREATE POLICY "order_deliveries_update_staff" ON public.order_deliveries FOR UPDATE TO authenticated USING (public.is_staff_user());

