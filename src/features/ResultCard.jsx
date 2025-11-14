import React, { useMemo, memo } from "react";
import "../styles/features/result-card.css";

/* ========== Helpers de normalización ========== */
const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

/* ========== Resolución robusta del URL del proceso ========== */
const getUrlProceso = (item) => {
  if (!item) return "#";

  // 1) Preferir anidado: urlproceso.url
  if (item.urlproceso && item.urlproceso.url) {
    return item.urlproceso.url; // Usamos la URL de "urlproceso.url"
  }

  // 2) Variantes planas conocidas
  const flat =
    (item["URL_Proceso"] || item["url_proceso"] || item["url"] || item["link"]);

  // 3) Si ya es un detalle público, usarlo
  if (typeof flat === "string" && /OpportunityDetail|noticeUID|isFromPublicArea/i.test(flat)) {
    return flat;
  }

  return flat || "#";
};

const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    // acceso por rutas anidadas
    if (k.includes(".")) {
      const v2 = getByPath(item, k);
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== "") return v2;
    }
    const val = idx.get(canon(k));
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return fallback;
};

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const seg of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    const target = Object.keys(cur).find((k) => canon(k) === canon(seg));
    if (!target) return undefined;
    cur = cur[target];
  }
  return cur;
};

const formatCOP = (val) => {
  if (val === null || val === undefined) return "No disponible";
  const only = String(val).replace(/[^\d.,-]/g, "");
  const num = Number(only.replace(/\./g, "").replace(/,/g, "."));
  if (!isFinite(num) || isNaN(num) || num === 0) return "Cuantía no especificada";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(num);
};

export default memo(function ResultCard({ item = {}, onClick }) {
  const idx = useMemo(() => buildIndex(item), [item]);

  const urlResuelto = getUrlProceso(item);

  const titulo = get(item, idx, ["Entidad", "nombre_entidad", "entidad", "nombreEntidad"], "Entidad no especificada");
  const fase   = get(item, idx, ["Fase", "Estado", "fase", "estado"], "No disponible");
  const ref    = get(item, idx, ["Referencia_del_proceso", "Referencia_del_contrato", "Proceso_de_compra", "ID_contrato", "referencia", "id_contrato"], "No disponible");
  const dpto   = get(item, idx, ["Departamento_de_la_entidad", "Departamento", "departamento_de_la_entidad", "departamento"], "Departamento N/D");
  const ciudad = get(item, idx, ["Ciudad_entidad", "Ciudad", "ciudad_entidad", "ciudad"], "Ciudad N/D");
  const precioVal = get(item, idx, ["Precio_base", "precio_base", "cuantia", "valor", "valor_contrato", "valor_estimado"], null);
  const precio = precioVal ? formatCOP(precioVal) : "Cuantía no especificada";
  const descripcion = get(item, idx, ["Descripcion", "descripcion"], "");
  const codigoUnsp = get(item, idx, ["Codigo_categoria", "codigo_categoria", "codCategoria"], "");

  return (
    <article
      onClick={onClick}
      className="result-card-container"
    >
      <span className="result-card-accent-bar" />

      <header className="result-card-header">
        <h3 className="result-card-title">
          {titulo}
        </h3>

        <div className="result-card-badges">
          <span className="result-card-badge-ref">
            Ref: <span className="result-card-badge-ref-value">{ref}</span>
          </span>
          <span className="result-card-badge-phase">
            {fase}
          </span>
          <span className="result-card-badge-location">
            {dpto} • {ciudad}
          </span>
          {codigoUnsp && (
            <span className="result-card-badge-unsp">
              {codigoUnsp}
            </span>
          )}
        </div>
      </header>

      {descripcion ? (
        <section className="result-card-description">
          <div className="result-card-description-box">
            <p className="result-card-description-text">
              {descripcion}
            </p>
          </div>
        </section>
      ) : null}

      <footer className="result-card-footer">
        <div className="result-card-price">💰 {precio} Pesos</div>
      </footer>
    </article>
  );
});
