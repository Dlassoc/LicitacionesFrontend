/**
 * Helpers para procesamiento de documentos de licitaciones (Socrata/SECOP).
 * Incluye: deduplicación, fingerprinting de URLs, detección de documentos financieros.
 */
import { normWs } from './commonHelpers.js';

/* ==== Helpers de índice canónico ==== */
export const canon = (k) =>
  String(k || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

export const buildIndex = (obj) => {
  const idx = new Map();
  for (const [k, v] of Object.entries(obj || {})) idx.set(canon(k), v);
  return idx;
};

export const get = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    const v = idx.get(canon(k));
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

/* ==== URL helpers ==== */
/** Devuelve la primera URL válida (string o {url: "..."}) */
export const firstUrl = (...vals) => {
  for (const v of vals) {
    if (v && typeof v === "object" && typeof v.url === "string" && v.url.startsWith("http")) {
      return v.url.trim();
    }
    if (typeof v === "string" && v.trim().startsWith("http")) {
      return v.trim();
    }
  }
  return null;
};

/* ==== Mapeo de documentos de Socrata ==== */
/** Toma un registro de dmgg-8hin y arma un objeto amigable para UI. */
export const mapDoc = (doc) => {
  const titulo =
    doc?.nombre_documento ?? doc?.nombre_do ?? doc?.nombre_del_documento ??
    doc?.documento ?? doc?.titulo ?? doc?.nombre_archivo ?? doc?.descripcion ?? "Documento";

  const tipo = doc?.tipo_de_documento ?? doc?.tipo_documento ?? doc?.extension ?? doc?.tipo ?? null;
  const fecha = doc?.fecha_publicacion_documento ?? doc?.fecha_carga ?? doc?.fecha ?? doc?.fecha_publicacion ?? null;
  const tamanio = doc?.tamano ?? doc?.tamanio ?? doc?.tamano_documento ?? doc?.size_bytes ?? null;
  const proceso = doc?.proceso ?? null;

  const url = firstUrl(
    doc?.url_descarga_documento, doc?.url, doc?.enlace, doc?.link,
    doc?.url_descarga, doc?.archivo, doc?.archivo_url, doc?.ruta
  );

  return { titulo, tipo, fecha, tamanio, proceso, url, es_documento_indicadores: false, razon: null };
};

/* ==== Deduplicación ==== */
/** Huella canónica de URL SECOP */
export function secopFingerprint(u) {
  if (!u) return "";
  let raw = String(u).trim();
  try {
    const url = new URL(raw);
    const host = url.host.toLowerCase();
    const path = url.pathname.toLowerCase();
    const isSecop = /secop|colombiacompra\.gov\.co/i.test(host);
    const qp = new URLSearchParams(url.search);
    const docId = qp.get("DocumentId") || qp.get("documentid");
    const uniq = qp.get("DocUniqueIdentifier") || qp.get("docuniqueidentifier");

    if (isSecop && (docId || uniq)) {
      return `secop:${(docId || "").toLowerCase()}:${(uniq || "").toLowerCase()}`;
    }
    const fileName = path.split("/").pop() || "";
    if (isSecop && fileName) return `secopfile:${fileName}`;

    return `${url.protocol.toLowerCase()}//${host}${path}?${[...qp.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`)
      .join("&")}`;
  } catch {
    return raw.toLowerCase();
  }
}

const docKey = (d) => {
  const t = normWs(d?.titulo);
  if (t) return `titulo:${t}`;
  const fp = secopFingerprint(d?.url);
  if (fp) return `fp:${fp}`;
  const f = normWs(d?.fecha);
  const z = normWs(d?.tamanio);
  return `tf:${t}|${f}|${z}`;
};

const filledScore = (d) => {
  let s = 0;
  if (d?.tipo) s += 1;
  if (d?.fecha) s += 1;
  if (d?.tamanio) s += 1;
  if (d?.proceso) s += 1;
  s += Math.min(3, (d?.titulo || "").length / 20);
  return s;
};

export function dedupeDocs(docs) {
  const seen = new Map();
  const out = [];
  for (const d of docs || []) {
    const k = docKey(d);
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, d);
      out.push(d);
    } else {
      const best = filledScore(d) > filledScore(prev) ? d : prev;
      seen.set(k, best);
      const idx = out.findIndex((x) => docKey(x) === k);
      if (idx !== -1) out[idx] = best;
    }
  }
  return out;
}

/* ==== Detección de documentos financieros ==== */
const normalizeForMatching = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const FIN_RULES = [
  { re: /\bcertificado\s+de\s+capacidad\s+financiera\s+y\s+organizacional\b/, score: 130 },
  { re: /\bdocumento\s+de\s+requisitos?\s+habi[l|]itantes?\s+financieros?\b/, score: 128 },
  { re: /\brequisitos?\s+habi[l|]itantes?:?\s*capacidad\s+financiera\b/, score: 126 },
  { re: /\bformato\s+de\s+indicadores\s+de\s+entidades?\s+sin\s+an[ií]mo\s+de\s+lucro\b/, score: 124 },
  { re: /\bc[aá]lculo\s+de\s+indicadores?\s+financieros?\b/, score: 122 },
  { re: /\bevaluaci[oó]n\s+financiera\b/, score: 120 },
  { re: /\bindicadores?\s+financieros?\s+y\s+organizacionales?\b/, score: 120 },
  { re: /\bcapacidad\s+financiera\b/, score: 118 },
  { re: /\bformato\s*4\b/, score: 116 },
  { re: /\bindicadores?\b/, score: 112 },
  { re: /\banexo(\s*#?\s*\d+)?\s*-\s*financiero\b/, score: 110 },
  { re: /\b-?\s*indicadores?\b/, score: 110 },
  { re: /\bestados?\s+financieros?\s+(auditados?\s*)?(\d{4})?\b/, score: 105 },
  { re: /\bnotas?\s+a\s+los?\s+estados?\s+financieros?\b/, score: 96 },
  { re: /\bcertificado\s+de\s+(contador\s+p[uú]blico|revisor\s+fiscal)\b/, score: 100 },
  { re: /\bconstancia\s+de\s+persona\s+natural\s+no\s+obligada\s+a\s+contabilidad\b/, score: 95 },
  { re: /\bestudios?\s+previo[s]?\b/, score: 80 },
  { re: /\b_?est_?prev\b/i, score: 78 },
  { re: /\best\.?\s*prev\b/i, score: 76 },
  { re: /\bpliego(s)?\s+de\s+condiciones\s+definitivo\b/, score: 78 },
  { re: /\bpliego(s)?\s+definitivo(s)?\b/, score: 78 },
  { re: /\bpliego(s)?\s+de\s+condiciones\b/, score: 72 },
  { re: /\bcondiciones\s+generales\b/, score: 60 },
  { re: /\baviso\s+de\s+convocatoria\b/, score: 30 },
];

export function tagFinancialIndicatorDocs(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];

  let bestIdx = -1;
  let bestScore = -1;

  const scored = docs.map((d, i) => {
    const t = normalizeForMatching(d.titulo);
    const tp = normalizeForMatching(d.tipo);
    let score = 0;

    for (const r of FIN_RULES) {
      const hit = (t && r.re.test(t)) || (tp && r.re.test(tp));
      if (hit && r.score > score) score = r.score;
    }

    if (/\bestados?\s+financieros?\s+(auditados?\s*)?\d{4}\b/.test(t || "")) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
    return { ...d, _score: score };
  });

  const tagged = scored.map((d, i) => ({
    ...d,
    es_documento_indicadores: i === bestIdx && bestScore > 0,
    razon: i === bestIdx && bestScore > 0 ? null : (d.razon || null),
  }));

  tagged.sort((a, b) => {
    if (a.es_documento_indicadores !== b.es_documento_indicadores) {
      return a.es_documento_indicadores ? -1 : 1;
    }
    return (b._score || 0) - (a._score || 0);
  });

  return tagged.map(({ _score, ...rest }) => rest);
}

export const OMIT_FIELDS = new Set([
  "Enlace_oficial", "Documentos", "URL_Proceso",
  "ID_Portafolio", "id_del_portafolio",
  "Codigo_categoria", "Categorias_adicionales"
]);
