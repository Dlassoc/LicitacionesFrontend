import { useEffect } from "react";
import { SEARCH_STORAGE_KEYS } from "./storage.js";

export function useSearchResultsPersistence({ resultados, total, limit, offset, lastQuery }) {
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEYS.RESULTS, JSON.stringify(resultados));
    } catch (e) {
      console.warn("Error guardando resultados:", e);
    }
  }, [resultados]);

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEYS.TOTAL, total.toString());
    } catch (e) {
      console.warn("Error guardando total:", e);
    }
  }, [total]);

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEYS.LIMIT, limit.toString());
    } catch (e) {
      console.warn("Error guardando limit:", e);
    }
  }, [limit]);

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEYS.OFFSET, offset.toString());
    } catch (e) {
      console.warn("Error guardando offset:", e);
    }
  }, [offset]);

  useEffect(() => {
    try {
      if (lastQuery) {
        localStorage.setItem(SEARCH_STORAGE_KEYS.QUERY, JSON.stringify(lastQuery));
      } else {
        localStorage.removeItem(SEARCH_STORAGE_KEYS.QUERY);
      }
    } catch (e) {
      console.warn("Error guardando query:", e);
    }
  }, [lastQuery]);
}
