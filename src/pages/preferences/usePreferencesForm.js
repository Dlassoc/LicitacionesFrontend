import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext.jsx";
import { apiGet, apiPost } from "../../config/httpClient.js";

const INDICATOR_FIELDS = [
  "indicador_liquidez",
  "nivel_endeudamiento",
  "razon_cobertura_intereses",
  "rentabilidad_patrimonio",
  "rentabilidad_activo",
  "capacidad_deudas_corto_plazo",
  "porcentaje_acreedores",
  "retribucion_riesgo_propiedad",
  "capacidad_generar_ganancias",
];

const parseOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function usePreferencesForm(unlocked = true) {
  const { updateUser } = useAuth();

  // Identity
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Alert preferences
  const [palabras, setPalabras] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");

  // Subscriptions
  const [subs, setSubs] = useState([]);

  // Status flags
  const [msg, setMsg] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [running, setRunning] = useState(false);
  const [msgPrefs, setMsgPrefs] = useState("");

  // Financial indicators
  const [savingFin, setSavingFin] = useState(false);
  const [msgFin, setMsgFin] = useState("");
  const [indicators, setIndicators] = useState(() =>
    Object.fromEntries(INDICATOR_FIELDS.map((k) => [k, ""]))
  );

  // Cache stats
  const [cacheStats, setCacheStats] = useState(null);
  const [loadingCache, setLoadingCache] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [msgCache, setMsgCache] = useState("");

  const hasSavedSubs = subs.length > 0;
  const isActive = useMemo(() => unlocked || hasSavedSubs, [unlocked, hasSavedSubs]);

  const setIndicator = useCallback((field, value) => {
    setIndicators((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ---- Loaders ----

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setMsg("");
    try {
      const data = await apiGet("/auth/me");
      setEmail(data?.email || "");
      setName(data?.name || "");
    } catch {
      setMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
      setEmail("");
      setName("");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const loadSubs = useCallback(async (em) => {
    if (!em) { setSubs([]); return; }
    setLoadingSubs(true);
    try {
      const data = await apiGet(`/subscriptions?email=${encodeURIComponent(em)}`);
      setSubs(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch {
      setSubs([]);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const loadIndicadores = useCallback(async () => {
    try {
      const data = await apiGet("/finanzas/indicadores");
      if (data?.ok && data?.data) {
        const ind = data.data;
        setIndicators((prev) => {
          const next = { ...prev };
          for (const field of INDICATOR_FIELDS) {
            if (ind[field] !== null && ind[field] !== undefined) {
              next[field] = String(ind[field]);
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error("[PREFERENCES] Error cargando indicadores:", err);
    }
  }, []);

  const loadCacheStats = useCallback(async () => {
    if (!email) return;
    setLoadingCache(true);
    try {
      const data = await apiGet("/analysis/batch/cache/stats");
      if (data?.ok) setCacheStats(data);
    } catch {
      setCacheStats(null);
    } finally {
      setLoadingCache(false);
    }
  }, [email]);

  // ---- Actions ----

  const saveName = async () => {
    if (!name?.trim() || !email) return;
    try {
      await apiPost("/auth/users", { email, name: name.trim() });
      updateUser({ name: name.trim() });
    } catch (e) {
      console.error("Error al guardar nombre:", e);
    }
  };

  const deactivate = async (id) => {
    if (!id) return;
    try {
      await apiPost(`/subscriptions/${id}/deactivate`);
    } catch { /* ignore */ }
    finally { await loadSubs(email); }
  };

  const runNow = async () => {
    if (!email) {
      setMsgPrefs("No hay correo de sesión. Inicia sesión para probar el envío.");
      return;
    }
    setRunning(true);
    setMsgPrefs("");
    try {
      const data = await apiPost(
        `/subscriptions/run-digest-now?email=${encodeURIComponent(email)}&days_back=30&force=true`
      );
      const itemsCount =
        typeof data.items === "number" ? data.items
        : typeof data.items_untrimmed === "number" ? data.items_untrimmed
        : 0;
      setMsgPrefs(
        `Envío de prueba ejecutado: ${data.emails_sent ?? "?"} email(s) enviado(s), ${itemsCount} licitación(es) encontrada(s). Revisa tu correo.`
      );
    } catch (e) {
      setMsgPrefs("No se pudo ejecutar el envío de prueba. " + (e.message || ""));
    } finally {
      setRunning(false);
    }
  };

  const savePrefs = async () => {
    if (!email) { setMsgPrefs("Inicia sesión para guardar preferencias."); return; }
    if (!palabras.trim()) { setMsgPrefs("Ingresa al menos una palabra clave."); return; }

    setSavingPrefs(true);
    setMsgPrefs("");
    try {
      await apiPost("/subscriptions", { email, palabras_clave: palabras, departamento, ciudad });
      setMsgPrefs("Preferencias de correo guardadas correctamente");
      await loadSubs(email);

      // Redirect to search with these preferences
      const qp = new URLSearchParams();
      if (palabras.trim()) qp.append("q", palabras.trim());
      if (departamento) qp.append("departamento", departamento);
      if (ciudad) qp.append("ciudad", ciudad);
      window.location.href = `/app?${qp.toString()}`;
    } catch (e) {
      setMsgPrefs("Error al guardar preferencias: " + (e.message || ""));
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveFin = async () => {
    setMsgFin("");
    setSavingFin(true);
    try {
      const payload = {};
      for (const [k, v] of Object.entries(indicators)) {
        const pv = parseOrNull(v);
        if (pv !== null) payload[k] = pv;
      }
      if (Object.keys(payload).length === 0) {
        setMsgFin("No hay valores para guardar. Completa al menos un campo.");
        return;
      }
      const data = await apiPost("/finanzas/indicadores", payload);
      if (data?.ok === false) {
        throw new Error(data?.detail || data?.error || "Error al guardar indicadores");
      }
      setMsgFin("Indicadores financieros guardados correctamente");
      await loadIndicadores();
    } catch (e) {
      setMsgFin("Error al guardar los indicadores: " + (e.message || ""));
    } finally {
      setSavingFin(false);
    }
  };

  const clearAnalysisCache = async () => {
    if (!email) return;
    if (!confirm("¿Estás seguro de que deseas limpiar el caché de análisis? Esto forzará el re-análisis de todas las licitaciones.")) return;

    setClearingCache(true);
    setMsgCache("");
    try {
      const data = await apiPost("/analysis/batch/cache/clear", {});
      if (data?.ok) {
        setMsgCache(`Se eliminaron ${data.deleted} análisis del caché`);
        await loadCacheStats();
      } else {
        setMsgCache(`Error: ${data?.error || "Error desconocido"}`);
      }
    } catch (e) {
      setMsgCache(`Error al limpiar caché: ${e.message}`);
    } finally {
      setClearingCache(false);
    }
  };

  // ---- Effects ----

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (email) {
      loadSubs(email);
      loadIndicadores();
      loadCacheStats();
    }
  }, [email]);

  return {
    // Identity
    email, name, setName, saveName,
    // Alert preferences
    palabras, setPalabras, departamento, setDepartamento, ciudad, setCiudad,
    // Status
    msg, loadingSession, loadingSubs, savingPrefs, running, msgPrefs, isActive,
    // Actions
    savePrefs, runNow, deactivate,
    // Subscriptions
    subs,
    // Financial indicators
    indicators, setIndicator, savingFin, msgFin, saveFin,
    // Cache
    cacheStats, loadingCache, clearingCache, msgCache,
    clearAnalysisCache, loadCacheStats,
  };
}
