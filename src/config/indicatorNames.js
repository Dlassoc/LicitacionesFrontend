/**
 * Mapeo de nombres de indicadores financieros a sus etiquetas en español
 */

const INDICATOR_DISPLAY_NAMES = {
  liquidez_corriente: 'Liquidez',
  indice_liquidez: 'Liquidez',
  indicador_liquidez: 'Liquidez',
  
  endeudamiento: 'Nivel de Endeudamiento',
  nivel_endeudamiento: 'Nivel de Endeudamiento',
  indice_endeudamiento: 'Nivel de Endeudamiento',
  
  cobertura_intereses: 'Razón de Cobertura de Intereses',
  razon_cobertura_intereses: 'Razón de Cobertura de Intereses',
  cobertura_de_intereses: 'Razón de Cobertura de Intereses',
  
  rentabilidad_patrimonio: 'Rentabilidad sobre el Patrimonio (ROE)',
  roe: 'Rentabilidad sobre el Patrimonio (ROE)',
  rentabilidad_sobre_patrimonio: 'Rentabilidad sobre el Patrimonio (ROE)',
  
  rentabilidad_activo: 'Rentabilidad del Activo (ROA)',
  roa: 'Rentabilidad del Activo (ROA)',
  rentabilidad_del_activo: 'Rentabilidad del Activo (ROA)',
  
  capital_trabajo: 'Capital de Trabajo',
  capital_de_trabajo: 'Capital de Trabajo',
};

/**
 * Obtiene el nombre en español para mostrar de un indicador
 * @param {string} indicatorKey - Clave del indicador (ej: 'liquidez_corriente')
 * @returns {string} Nombre formateado en español (ej: 'Liquidez')
 */
export function getIndicatorDisplayName(indicatorKey) {
  if (!indicatorKey) return 'Indicador Desconocido';
  
  const normalizedKey = String(indicatorKey).toLowerCase().trim();
  
  if (INDICATOR_DISPLAY_NAMES[normalizedKey]) {
    return INDICATOR_DISPLAY_NAMES[normalizedKey];
  }
  
  // Fallback: convertir snake_case a Title Case
  return normalizedKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default INDICATOR_DISPLAY_NAMES;
