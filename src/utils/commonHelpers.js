/**
 * Utilidades compartidas para componentes de ResultModal y DescriptionSection
 */

/**
 * Normaliza y renderiza valores generales
 */
export const renderVal = (v) => {
  if (v === null || v === undefined || v === "") return "No disponible";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "No disponible";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/**
 * Acorta texto con elipsis si excede maxChars
 * @param {string} txt - Texto a procesar
 * @param {number} maxChars - Máximo de caracteres (default 320)
 * @returns {string} Texto acortado con elipsis si aplica
 */
export const previewText = (txt, maxChars = 320) =>
  txt.length > maxChars ? txt.slice(0, maxChars).trim() + "…" : txt;

/**
 * Verifica si una clave pertenece a una descripción
 */
export const isDescriptionKey = (k) => /descripci[oó]n/i.test(k);

/**
 * Normaliza espacios en blanco
 */
export const normWs = (s) => String(s || "").replace(/\s+/g, " ").trim();

/**
 * Normaliza string para comparación (lowercase y sin espacios extras)
 */
export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Convierte clave a título legible
 * Ejemplo: user_name -> User Name
 */
export const prettyKey = (k) =>
  k.replace(/_/g, " ")
   .replace(/([A-Z])/g, " $1")
   .replace(/\s+/g, " ")
   .trim();
