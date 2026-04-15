/**
 * Utilidades compartidas para componentes de ResultModal y DescriptionSection
 */

/**
 * Normaliza valores de "cumple" de múltiples formatos (bool, number, string) a true/false/null
 */
export const normalizeCumpleValue = (raw) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw > 0;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (['1', 'true', 't', 'yes', 'y', 'si', 's'].includes(v)) return true;
    if (['0', 'false', 'f', 'no', 'n'].includes(v)) return false;
    if (!v) return null;
  }
  return null;
};

/**
 * Normaliza ID de licitación a string limpio
 */
export const normalizeLicitacionId = (raw) => {
  if (raw === null || raw === undefined) return '';
  return typeof raw === 'string' ? raw.trim() : String(raw).trim();
};

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

/** Valida formato de email básico (sin regex compleja para evitar ReDoS). */
export const isValidEmail = (email) => {
  const value = String(email || "").trim();
  if (!value || value.length > 254) return false;
  if (value.includes(" ")) return false;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@")) return false;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (!local || !domain) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  const dotIndex = domain.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === domain.length - 1) return false;

  return true;
};
