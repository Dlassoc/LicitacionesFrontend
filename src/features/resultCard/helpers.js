import { canon, buildIndex } from '../../utils/documentHelpers.js';

export const getUrlProceso = (item) => {
  if (!item) return '#';

  if (item.urlproceso && item.urlproceso.url) {
    return item.urlproceso.url;
  }

  const flat = item.URL_Proceso || item.url_proceso || item.url || item.link;

  if (typeof flat === 'string' && /OpportunityDetail|noticeUID|isFromPublicArea/i.test(flat)) {
    return flat;
  }

  return flat || '#';
};

export const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const seg of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    const target = Object.keys(cur).find((k) => canon(k) === canon(seg));
    if (!target) return undefined;
    cur = cur[target];
  }
  return cur;
};

export const getFromIndex = (item, idx, keys, fallback = null) => {
  for (const k of keys) {
    if (k.includes('.')) {
      const v2 = getByPath(item, k);
      if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') return v2;
    }
    const val = idx.get(canon(k));
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
  }
  return fallback;
};

export const formatCOP = (val) => {
  if (val === null || val === undefined) return 'No disponible';
  const only = String(val).replace(/[^\d.,-]/g, '');
  const num = Number(only.replace(/\./g, '').replace(/,/g, '.'));
  if (!isFinite(num) || isNaN(num) || num === 0) return 'Cuantía no especificada';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num);
};

export const findAllIndicators = (obj, depth = 0) => {
  if (depth > 10) return {};
  if (!obj || typeof obj !== 'object') return {};

  const found = {};
  const indicatorKeys = ['matrices', 'indicadores_financieros', 'razon', 'detalles'];

  for (const key of indicatorKeys) {
    if (!obj[key]) continue;
    const val = obj[key];

    if ((key === 'indicadores_financieros' || key === 'matrices') && typeof val === 'object') {
      Object.assign(found, val);
    } else if (val.matrices && typeof val.matrices === 'object') {
      Object.assign(found, val.matrices);
    } else if (typeof val === 'object' && Object.keys(val).length > 0) {
      const indicatorEntries = Object.entries(val).filter(([, v]) => {
        return typeof v === 'object' && v !== null && (v.requerido !== undefined || v.cumple !== undefined || v.usuario !== undefined);
      });

      if (indicatorEntries.length > 0) {
        indicatorEntries.forEach(([name, indicator]) => {
          found[name] = indicator;
        });
      } else {
        const isIndicator = Object.values(val).some((v) =>
          (typeof v === 'object' && (v.requerido !== undefined || v.cumple !== undefined)) ||
          /^[0-9\.,\s><=]+/.test(String(v))
        );
        if (isIndicator) {
          Object.assign(found, val);
        }
      }
    }
  }

  if (Object.keys(found).length === 0) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null && k !== '_analysisStatus') {
        const recursive = findAllIndicators(v, depth + 1);
        if (Object.keys(recursive).length > 0) {
          Object.assign(found, recursive);
          break;
        }
      }
    }
  }

  return found;
};

export const compareUserVsRequired = (userRaw, reqRaw) => {
  if (userRaw === 'N/D' || userRaw === null || userRaw === undefined) return false;

  const userNum = parseFloat(String(userRaw).replace(',', '.'));
  if (Number.isNaN(userNum)) return false;

  const reqText = String(reqRaw ?? '').trim();
  const match = reqText.match(/(>=|≤|<=|≥|>|<|=)?\s*(-?\d+(?:[.,]\d+)?)/);
  if (!match) return false;

  const op = match[1] || '>=';
  const reqNum = parseFloat(match[2].replace(',', '.'));
  if (Number.isNaN(reqNum)) return false;

  if (op === '>=' || op === '≥') return userNum >= reqNum - 0.001;
  if (op === '>') return userNum > reqNum - 0.001;
  if (op === '<=' || op === '≤') return userNum <= reqNum + 0.001;
  if (op === '<') return userNum < reqNum + 0.001;
  if (op === '=') return Math.abs(userNum - reqNum) <= 0.001;
  return false;
};

export const buildIndicatorComparisons = (matricesData, detalles) => {
  const allComparisons = [];

  Object.entries(matricesData || {}).forEach(([nombre, valor]) => {
    let requerido = null;
    if (typeof valor === 'object' && valor !== null && valor.requerido !== undefined) {
      requerido = valor.requerido;
    } else if (typeof valor !== 'object') {
      requerido = valor;
    }
    allComparisons.push({ nombre, requerido });
  });

  const userValues = {};
  if (detalles) {
    const parsedDetalles = typeof detalles === 'string' ? JSON.parse(detalles) : detalles;
    Object.entries(parsedDetalles).forEach(([key, val]) => {
      if (typeof val === 'object' && val.usuario !== undefined) {
        userValues[key] = val.usuario;
      }
    });
  }

  const userValuesIndex = buildIndex(userValues);

  return allComparisons.map(({ nombre, requerido }) => {
    const userVal = userValues[nombre] ?? userValuesIndex.get(canon(nombre)) ?? 'N/D';
    const cumple = compareUserVsRequired(userVal, requerido);
    const requeridoText = requerido === null || requerido === undefined ? 'N/D' : String(requerido);
    return { nombre, requeridoText, userVal, cumple };
  });
};
