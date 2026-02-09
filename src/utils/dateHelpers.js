/**
 * Utilidades de fechas para búsquedas
 */

/**
 * Obtiene el rango de fechas del mes actual
 * @returns {Object} {primerDiaDelMes, ultimoDiaDelMes} en formato YYYY-MM-DD
 */
export function getCurrentMonthRange() {
  const hoy = new Date();
  const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  
  return {
    primerDiaDelMes: primerDiaDelMes.toISOString().split('T')[0],
    ultimoDiaDelMes: ultimoDiaDelMes.toISOString().split('T')[0]
  };
}

/**
 * Obtiene el rango de fechas del año actual
 * @returns {Object} {primerDiaDelAno, ultimoDiaDelAno} en formato YYYY-MM-DD
 */
export function getCurrentYearRange() {
  const hoy = new Date();
  return {
    primerDiaDelAno: `${hoy.getFullYear()}-01-01`,
    ultimoDiaDelAno: `${hoy.getFullYear()}-12-31`
  };
}

/**
 * Obtiene el rango de fechas para búsquedas
 * Usado para establecer un rango por defecto: enero 1 hasta hoy
 * @param {string} fechaRecDesde - Fecha desde (opcional)
 * @param {string} fechaRecHasta - Fecha hasta (opcional)
 * @returns {Object} {finalFechaRecDesde, finalFechaRecHasta}
 */
export function getFinalDateRange(fechaRecDesde, fechaRecHasta) {
  let finalFechaRecDesde = fechaRecDesde;
  let finalFechaRecHasta = fechaRecHasta;
  
  if (!finalFechaRecDesde || !finalFechaRecHasta) {
    // 🔒 RANGO POR DEFECTO: Enero 1 hasta hoy
    const hoy = new Date();
    const año = hoy.getFullYear();
    
    if (!finalFechaRecDesde) {
      finalFechaRecDesde = `${año}-01-01`;
    }
    if (!finalFechaRecHasta) {
      finalFechaRecHasta = hoy.toISOString().split('T')[0];
    }
  }
  
  return { finalFechaRecDesde, finalFechaRecHasta };
}
