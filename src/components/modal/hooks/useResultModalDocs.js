import { useEffect, useState } from 'react';
import request from '../../../config/httpClient.js';
import { devLog } from '../../../utils/devLog.js';
import { dedupeDocs, mapDoc, tagFinancialIndicatorDocs } from '../../../utils/documentHelpers.js';

const DMGG_API = 'https://www.datos.gov.co/resource/dmgg-8hin.json';

export function useResultModalDocs({ open, idPortafolio }) {
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsErr, setDocsErr] = useState('');
  const [debugQuery, setDebugQuery] = useState(null);

  useEffect(() => {
    if (!open || !idPortafolio) {
      return;
    }

    let abort = false;
    let retryCount = 0;
    const maxRetries = 3;

    const loadDocs = async () => {
      setDocsErr('');
      setDocs([]);
      setDebugQuery(null);
      setDocsLoading(true);

      const startTime = performance.now();

      try {
        const clean = idPortafolio.trim();
        const where = `upper(trim(proceso)) = upper('${clean}')`;

        const params = new URLSearchParams();
        params.set('$where', where);
        params.set('$limit', '500');

        const url = `${DMGG_API}?${params.toString()}`;
        setDebugQuery({ DMGG_API, params: Object.fromEntries(params.entries()) });

        const res = await request(url, { method: 'GET', raw: true });
        const elapsed = (performance.now() - startTime).toFixed(0);
        devLog(`[RESULT_MODAL] 📥 Docs response in ${elapsed}ms`);

        if (!res.ok) {
          const txt = await res.text().catch(() => '');

          if (res.status === 503 && retryCount < maxRetries) {
            retryCount += 1;
            if (!abort) {
              setTimeout(() => {
                if (!abort) loadDocs();
              }, 2000);
            }
            return;
          }

          throw new Error(`Socrata respondió ${res.status}: ${txt || 'error'}`);
        }

        const raw = await res.json();
        const mapped = Array.isArray(raw) ? raw.map(mapDoc) : [];

        mapped.slice(0, 5).forEach((d, i) => devLog(`   [${i}] ${d.titulo} | URL: ${d.url?.substring(0, 80)}`));

        const deduped = dedupeDocs(mapped);
        deduped.slice(0, 5).forEach((d, i) => devLog(`   [${i}] ${d.titulo} | URL: ${d.url?.substring(0, 80)}`));

        const withUrl = deduped.filter(d => !!d.url);
        const sinUrl = deduped.filter(d => !d.url);

        if (sinUrl.length > 0) {
          sinUrl.forEach((d, i) => devLog(`   [${i}] ${d.titulo}`));
        }

        const tagged = tagFinancialIndicatorDocs(withUrl);

        if (!abort) {
          setDocs(tagged);
          setDocsLoading(false);
        }
      } catch (e) {
        if (!abort) {
          setDocsErr(e.message || 'Error al cargar descargas');
          setDocsLoading(false);
        }
      }
    };

    loadDocs();
    return () => {
      abort = true;
    };
  }, [open, idPortafolio]);

  return {
    docs,
    docsLoading,
    docsErr,
    debugQuery,
  };
}
