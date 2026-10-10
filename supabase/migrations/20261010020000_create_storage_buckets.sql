-- ==============================================================================
-- EcoTanti: Configuración de Storage Buckets para Imágenes de Catálogo
-- ==============================================================================

-- 1. Crear buckets 'media' y 'products' si no existen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE 
SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas de Seguridad RLS en storage.objects

-- Permitir lectura pública de archivos en buckets 'media' y 'products'
CREATE POLICY "Public Read Access for Media & Products"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('media', 'products'));

-- Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated Users Upload Access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('media', 'products'));

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Authenticated Users Update Access"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id IN ('media', 'products'));

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Authenticated Users Delete Access"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id IN ('media', 'products'));

