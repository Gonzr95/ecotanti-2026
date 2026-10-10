/**
 * Normaliza un texto para generar un slug válido para URLs y claves únicas.
 * Ejemplo: "Café Cabrales & Hnos!" -> "cafe-cabrales-hnos"
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD') // Descompone caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes, etc.)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Quita caracteres no alfanuméricos
    .replace(/[\s_-]+/g, '-') // Reemplaza espacios y guiones bajos por un solo guión
    .replace(/^-+|-+$/g, ''); // Remueve guiones al inicio y al final
}

