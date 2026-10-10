-- ==============================================================================
-- MIGRACIÓN: SEMILLAS DE PERMISOS Y ROLES EXPLÍCITOS (PBAC / RBAC)
-- ==============================================================================

-- 1. Asegurar roles base
INSERT INTO public.roles (name, description)
VALUES 
  ('administrador', 'Total control and administration of the system'),
  ('catalog_manager', 'Gestor de catálogo, productos, marcas y combos'),
  ('orders_operator', 'Operador de pedidos y entregas')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;

-- 2. Insertar catálogo estándar de permisos por módulo
INSERT INTO public.permissions (code, name, module, description)
VALUES
  -- Módulo Catálogo: Marcas
  ('catalog.brands.view', 'Ver marcas', 'catalog', 'Permite visualizar el listado de marcas'),
  ('catalog.brands.manage', 'Gestionar marcas', 'catalog', 'Permite crear, editar y eliminar marcas'),

  -- Módulo Catálogo: Productos
  ('catalog.products.view', 'Ver productos', 'catalog', 'Permite visualizar productos e inventario'),
  ('catalog.products.manage', 'Gestionar productos', 'catalog', 'Permite crear y editar productos y precios'),

  -- Módulo Catálogo: Combos
  ('catalog.bundles.view', 'Ver combos', 'catalog', 'Permite visualizar combos y promociones'),
  ('catalog.bundles.manage', 'Gestionar combos', 'catalog', 'Permite crear y editar combos y sus ítems'),

  -- Módulo Pedidos
  ('orders.view', 'Ver pedidos', 'orders', 'Permite visualizar órdenes y su estado de entrega'),
  ('orders.manage', 'Gestionar pedidos', 'orders', 'Permite actualizar estados, pagos y tracking'),

  -- Módulo Finanzas / Analíticas
  ('analytics.profit.view', 'Ver análisis de rentabilidad', 'analytics', 'Permite ver costos congelados, márgenes y ganancia'),

  -- Módulo Descuentos
  ('discounts.manage', 'Gestionar cupones', 'discounts', 'Permite crear cupones y reglas de descuento'),

  -- Módulo Seguridad y Usuarios
  ('users.roles.manage', 'Gestionar roles y usuarios', 'security', 'Permite asignar roles y permisos a usuarios')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description;

-- 3. Asignación Explícita a Roles (role_permissions)
-- Nota: La columna en role_permissions según schema es (rol_id, permission_id) o (role_id, permission_id)
DO $$
DECLARE
  v_admin_role_id INT8;
  v_catalog_role_id INT8;
  v_orders_role_id INT8;
  v_column_name TEXT;
BEGIN
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'administrador';
  SELECT id INTO v_catalog_role_id FROM public.roles WHERE name = 'catalog_manager';
  SELECT id INTO v_orders_role_id FROM public.roles WHERE name = 'orders_operator';

  -- Determinar si la columna se llama rol_id o role_id
  SELECT column_name INTO v_column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND column_name IN ('rol_id', 'role_id')
  LIMIT 1;

  IF v_column_name IS NULL THEN
    v_column_name := 'role_id';
  END IF;

  -- Para admin: asignar explícitamente TODOS los permisos uno a uno
  IF v_column_name = 'rol_id' THEN
    INSERT INTO public.role_permissions (rol_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Para catalog_manager: solo permisos de catalog
    INSERT INTO public.role_permissions (rol_id, permission_id)
    SELECT v_catalog_role_id, id FROM public.permissions WHERE module = 'catalog'
    ON CONFLICT DO NOTHING;

    -- Para orders_operator: permisos de orders
    INSERT INTO public.role_permissions (rol_id, permission_id)
    SELECT v_orders_role_id, id FROM public.permissions WHERE module = 'orders'
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_catalog_role_id, id FROM public.permissions WHERE module = 'catalog'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_orders_role_id, id FROM public.permissions WHERE module = 'orders'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Función de base de datos para verificación de permisos RLS
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has BOOLEAN;
  v_column_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT column_name INTO v_column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND column_name IN ('rol_id', 'role_id')
  LIMIT 1;

  IF v_column_name = 'rol_id' THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role_id = rp.rol_id
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
        AND p.code = p_permission_code
    ) INTO v_has;
  ELSE
    SELECT EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role_id = rp.role_id
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
        AND p.code = p_permission_code
    ) INTO v_has;
  END IF;

  RETURN COALESCE(v_has, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

