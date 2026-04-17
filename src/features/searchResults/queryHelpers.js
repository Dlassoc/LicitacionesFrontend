import { getFinalDateRange } from "../../utils/dateHelpers.js";

export function buildSearchParams({
  termino,
  fechaPubDesde,
  fechaPubHasta,
  fechaManifDesde,
  fechaManifHasta,
  fechaRecDesde,
  fechaRecHasta,
  ciudad,
  departamento,
  fase,
  estado,
  initialLimit,
}) {
  const { finalFechaRecDesde, finalFechaRecHasta } = getFinalDateRange(fechaRecDesde, fechaRecHasta);

  const baseParams = {
    palabras_clave: termino.trim(),
    limit: initialLimit,
    offset: 0,
  };

  if (fechaPubDesde) baseParams.fecha_pub_desde = fechaPubDesde;
  if (fechaPubHasta) baseParams.fecha_pub_hasta = fechaPubHasta;
  if (fechaManifDesde) baseParams.fecha_manif_desde = fechaManifDesde;
  if (fechaManifHasta) baseParams.fecha_manif_hasta = fechaManifHasta;
  if (finalFechaRecDesde) baseParams.fecha_rec_desde = finalFechaRecDesde;
  if (finalFechaRecHasta) baseParams.fecha_rec_hasta = finalFechaRecHasta;
  if (departamento) baseParams.departamento = departamento;
  if (ciudad) baseParams.ciudad = ciudad;
  if (fase) baseParams.fase = fase;
  if (estado) baseParams.estado = estado;

  return baseParams;
}

export function buildSearchChips(lastQuery) {
  if (!lastQuery) return [];

  let palabrasClave = [];
  if (lastQuery.palabras_clave) {
    palabrasClave = lastQuery.palabras_clave
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
  }

  const map = {
    ...(palabrasClave.length > 0 && {
      palabras_clave: ["Busqueda", lastQuery.palabras_clave],
    }),
    fecha_pub_desde: ["Pub. Desde", lastQuery.fecha_pub_desde],
    fecha_pub_hasta: ["Pub. Hasta", lastQuery.fecha_pub_hasta],
    fecha_rec_desde: ["Presentación Desde", lastQuery.fecha_rec_desde],
    fecha_rec_hasta: ["Presentación Hasta", lastQuery.fecha_rec_hasta],
    departamento: ["Depto", lastQuery.departamento],
    ciudad: ["Ciudad", lastQuery.ciudad],
  };

  return Object.entries(map)
    .filter(([, [, v]]) => v)
    .map(([k, [label, value]]) => ({ key: k, label, value }));
}
