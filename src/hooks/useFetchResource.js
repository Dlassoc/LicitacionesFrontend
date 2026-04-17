import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook genérico para recursos remotos.
 * Estandariza ciclo de carga, error y limpieza para hooks específicos.
 */
export function useFetchResource({ initialData = null, defaultTransform } = {}) {
  // Keep dynamic options in refs so returned callbacks stay stable across renders.
  const initialDataRef = useRef(initialData);
  const defaultTransformRef = useRef(defaultTransform);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    defaultTransformRef.current = defaultTransform;
  }, [defaultTransform]);

  const [data, setData] = useState(() => initialDataRef.current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (requestFn, options = {}) => {
      const { transform, keepPreviousData = true } = options;

      if (!keepPreviousData) {
        setData(initialDataRef.current);
      }

      setLoading(true);
      setError(null);

      try {
        const raw = await requestFn();
        const mapper = transform || defaultTransformRef.current;
        const next = mapper ? mapper(raw) : raw;
        setData(next);
        return next;
      } catch (err) {
        setError(err?.message || 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setData(initialDataRef.current);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    load,
    clear,
  };
}

export default useFetchResource;
