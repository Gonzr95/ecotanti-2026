-- ==============================================================================
-- Migración: Habilitar Supabase Realtime para la tabla orders
-- ==============================================================================
-- En Supabase PostgreSQL, las tablas no emiten eventos por WebSockets a menos que
-- pertenezcan a la publicación supabase_realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Habilitar REPLICA IDENTITY FULL para que los eventos de UPDATE y DELETE contengan
-- todos los datos de la fila anterior y actualizada.
ALTER TABLE public.orders REPLICA IDENTITY FULL;

