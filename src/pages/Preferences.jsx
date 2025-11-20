import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../styles/components/preferences.css";
import { useAuth } from "../auth/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Preferences({ unlocked = true }) {
  const { updateUser } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [palabras, setPalabras] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");

  const [msg, setMsg] = useState("");
  const [subs, setSubs] = useState([]);

  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Indicadores financieros (todos opcionales)
  const [savingFin, setSavingFin] = useState(false);
  const [msgFin, setMsgFin] = useState("");

  const [indicadorLiquidez, setIndicadorLiquidez] = useState("");
  const [nivelEndeudamiento, setNivelEndeudamiento] = useState("");
  const [razonCoberturaIntereses, setRazonCoberturaIntereses] = useState("");
  const [rentabilidadPatrimonio, setRentabilidadPatrimonio] = useState("");
  const [rentabilidadActivo, setRentabilidadActivo] = useState("");
  const [capacidadDeudasCortoPlazo, setCapacidadDeudasCortoPlazo] = useState("");
  const [porcentajeAcreedores, setPorcentajeAcreedores] = useState("");
  const [retribucionRiesgoPropiedad, setRetribucionRiesgoPropiedad] = useState("");
  const [capacidadGenerarGanancias, setCapacidadGenerarGanancias] = useState("");

  const hasSavedSubs = subs.length > 0;
  const isActive = useMemo(() => unlocked || hasSavedSubs, [unlocked, hasSavedSubs]);

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { method: "GET", credentials: "include" });
      if (!r.ok) {
        setMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
        setEmail("");
        setName("");
        return;
      }
      const data = await safeJson(r);
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
    if (!em) {
      setSubs([]);
      return;
    }
    setLoadingSubs(true);
    try {
      const r = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(em)}`, {
        credentials: "include",
      });
      if (!r.ok) {
        setSubs([]);
        return;
      }
      const data = await safeJson(r);
      setSubs(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch {
      setSubs([]);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  // ✅ NUEVO: Cargar indicadores financieros guardados
  const loadIndicadores = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/finanzas/indicadores`, {
        method: "GET",
        credentials: "include",
      });
      if (!r.ok) return;
      
      const data = await safeJson(r);
      if (data?.ok && data?.data) {
        const ind = data.data;
        // Cargar cada indicador en su estado
        if (ind.indicador_liquidez !== null && ind.indicador_liquidez !== undefined) setIndicadorLiquidez(String(ind.indicador_liquidez));
        if (ind.nivel_endeudamiento !== null && ind.nivel_endeudamiento !== undefined) setNivelEndeudamiento(String(ind.nivel_endeudamiento));
        if (ind.razon_cobertura_intereses !== null && ind.razon_cobertura_intereses !== undefined) setRazonCoberturaIntereses(String(ind.razon_cobertura_intereses));
        if (ind.rentabilidad_patrimonio !== null && ind.rentabilidad_patrimonio !== undefined) setRentabilidadPatrimonio(String(ind.rentabilidad_patrimonio));
        if (ind.rentabilidad_activo !== null && ind.rentabilidad_activo !== undefined) setRentabilidadActivo(String(ind.rentabilidad_activo));
        if (ind.capacidad_deudas_corto_plazo !== null && ind.capacidad_deudas_corto_plazo !== undefined) setCapacidadDeudasCortoPlazo(String(ind.capacidad_deudas_corto_plazo));
        if (ind.porcentaje_acreedores !== null && ind.porcentaje_acreedores !== undefined) setPorcentajeAcreedores(String(ind.porcentaje_acreedores));
        if (ind.retribucion_riesgo_propiedad !== null && ind.retribucion_riesgo_propiedad !== undefined) setRetribucionRiesgoPropiedad(String(ind.retribucion_riesgo_propiedad));
        if (ind.capacidad_generar_ganancias !== null && ind.capacidad_generar_ganancias !== undefined) setCapacidadGenerarGanancias(String(ind.capacidad_generar_ganancias));
      }
    } catch {
      // Ignorar errores de carga de indicadores
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (email) {
      loadSubs(email);
      loadIndicadores();  // ✅ NUEVO: Cargar indicadores cuando hay email
    }
  }, [email, loadSubs, loadIndicadores]);

  // Guardar nombre cuando pierde el foco
  const saveName = async () => {
    if (!name || !name.trim()) return;
    if (!email) return;
    try {
      const r = await fetch(`${API_BASE}/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name: name.trim() }),
      });
      if (!r.ok) {
        const data = await safeJson(r);
        console.error("Error al guardar nombre:", data);
      } else {
        // Actualizar el contexto de autenticación
        updateUser({ name: name.trim() });
      }
    } catch (e) {
      console.error("Error al guardar nombre:", e);
    }
  };

  const deactivate = async (id) => {
    if (!id) return;
    try {
      await fetch(`${API_BASE}/subscriptions/${id}/deactivate`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignorar
    } finally {
      await loadSubs(email);
    }
  };

  const runNow = async () => {
    if (!email) {
      setMsg("No hay correo de sesión. Inicia sesión para probar el envío.");
      return;
    }
    setRunning(true);
    try {
      const url = `${API_BASE}/subscriptions/run-digest-now?email=${encodeURIComponent(
        email
      )}&days_back=7&force=true`;
      const res = await fetch(url, { method: "POST", credentials: "include" });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo ejecutar el envío manual");
      }

      const itemsCount =
        typeof data.items === "number"
          ? data.items
          : typeof data.items_untrimmed === "number"
          ? data.items_untrimmed
          : 0;
      setMsg(`Se ejecutó el envío: emails_sent=${data.emails_sent ?? "?"}, items=${itemsCount}. Revisa tu correo.`);
    } catch (e) {
      setMsg("No se pudo ejecutar el envío manual. " + (e.message || ""));
    } finally {
      setRunning(false);
    }
  };

  // Guardar Indicadores Financieros
  const parseOrNull = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const saveFin = async () => {
    setMsgFin("");
    setSavingFin(true);
    try {
      const payload = {};
      const map = [
        ["indicador_liquidez", indicadorLiquidez],
        ["nivel_endeudamiento", nivelEndeudamiento],
        ["razon_cobertura_intereses", razonCoberturaIntereses],
        ["rentabilidad_patrimonio", rentabilidadPatrimonio],
        ["rentabilidad_activo", rentabilidadActivo],
        ["capacidad_deudas_corto_plazo", capacidadDeudasCortoPlazo],
        ["porcentaje_acreedores", porcentajeAcreedores],
        ["retribucion_riesgo_propiedad", retribucionRiesgoPropiedad],
        ["capacidad_generar_ganancias", capacidadGenerarGanancias],
      ];
      for (const [k, v] of map) {
        const pv = parseOrNull(v);
        if (pv !== null) payload[k] = pv;
      }
      if (Object.keys(payload).length === 0) {
        setMsgFin("No hay valores para guardar. Completa al menos un campo.");
        return;
      }

      const r = await fetch(`${API_BASE}/finanzas/indicadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await safeJson(r);
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.detail || data?.error || "Error al guardar indicadores");
      }

      setMsgFin(`Indicadores guardados correctamente (id=${data.id}). Email: ${data.email}`);
      
      // ✅ NUEVO: Recargar los indicadores después de guardar
      await loadIndicadores();
    } catch (e) {
      setMsgFin("Error al guardar los indicadores: " + (e.message || ""));
    } finally {
      setSavingFin(false);
    }
  };

  // Guardar todo (indicadores + intereses)
  const saveAll = async () => {
    setMsgFin("");
    setMsg("");
    setSavingFin(true);
    setSaving(true);

    try {
      // Guardar indicadores primero (si hay valores)
      const payload = {};
      const map = [
        ["indicador_liquidez", indicadorLiquidez],
        ["nivel_endeudamiento", nivelEndeudamiento],
        ["razon_cobertura_intereses", razonCoberturaIntereses],
        ["rentabilidad_patrimonio", rentabilidadPatrimonio],
        ["rentabilidad_activo", rentabilidadActivo],
        ["capacidad_deudas_corto_plazo", capacidadDeudasCortoPlazo],
        ["porcentaje_acreedores", porcentajeAcreedores],
        ["retribucion_riesgo_propiedad", retribucionRiesgoPropiedad],
        ["capacidad_generar_ganancias", capacidadGenerarGanancias],
      ];
      for (const [k, v] of map) {
        const pv = parseOrNull(v);
        if (pv !== null) payload[k] = pv;
      }

      if (Object.keys(payload).length > 0) {
        const r = await fetch(`${API_BASE}/finanzas/indicadores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await safeJson(r);
        if (!r.ok || data?.ok === false) {
          throw new Error(data?.detail || data?.error || "Error al guardar indicadores");
        }
        await loadIndicadores();
      }

      // Guardar preferencias (palabras clave, departamento, ciudad)
      const r2 = await fetch(`${API_BASE}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, palabras_clave: palabras, departamento, ciudad }),
      });
      const data2 = await safeJson(r2);
      if (!r2.ok) throw new Error(data2?.detail || data2?.error || "Error al guardar preferencias");

      setMsg("Cambios guardados correctamente ✓");
      await loadSubs(email);
    } catch (e) {
      setMsg("Error al guardar cambios: " + (e.message || ""));
    } finally {
      setSavingFin(false);
      setSaving(false);
    }
  };

  return (
    <div className="preferences-container">
      {!isActive && (
        <div className="preferences-overlay">
          <div className="preferences-overlay-content">
            <p className="preferences-overlay-title">
              Para configurar tus preferencias, realiza primero una búsqueda.
            </p>
            <p className="preferences-overlay-subtitle">
              Si ya tienes suscripciones guardadas, esta sección se activará automáticamente.
            </p>
          </div>
        </div>
      )}

      {loadingSession ? (
        <p className="preferences-loading-text">Cargando sesión…</p>
      ) : msg && !email ? (
        <p className="preferences-error-text">{msg}</p>
      ) : null}

      {/* Formulario completo */}
      <div className="preferences-grid">
        {/* Identidad */}
        <div className="preferences-field-group">
          <label className="preferences-field-label">Nombre</label>
          <input
            className="preferences-input"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            disabled={!isActive}
          />
        </div>
        <div className="preferences-field-group">
          <label className="preferences-field-label">Correo</label>
          <input
            className="preferences-input"
            placeholder="Correo"
            value={email}
            disabled={true}
            title="Este correo proviene de tu sesión"
          />
        </div>

        {/* Preferencias */}
        <input
          className="preferences-input preferences-grid-full"
          placeholder="Palabras clave (ej. acueducto, energía)"
          value={palabras}
          onChange={(e) => setPalabras(e.target.value)}
          disabled={!isActive}
        />
        <input
          className="preferences-input"
          placeholder="Departamento (opcional)"
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          disabled={!isActive}
        />
        <input
          className="preferences-input"
          placeholder="Ciudad (opcional)"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          disabled={!isActive}
        />

        {/* Indicadores financieros (debajo de Departamento/Ciudad) */}
        <div className="preferences-grid-full" style={{ marginTop: '1rem' }}>
          <h4 className="preferences-section-title">Indicadores financieros (opcional)</h4>
          <p className="preferences-section-description">
            Ingresa solo valores numéricos. Se guardarán únicamente los campos que tengan valor. Estos datos se usarán para personalizar tus búsquedas.
          </p>

          <div className="preferences-financial-grid">
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Indicador de liquidez (ej. 5.13)"
              value={indicadorLiquidez}
              onChange={(e) => setIndicadorLiquidez(e.target.value)}
              disabled={!isActive || savingFin}
              title="Capacidad de pagar obligaciones a corto plazo"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Nivel de endeudamiento (ej. 0.42)"
              value={nivelEndeudamiento}
              onChange={(e) => setNivelEndeudamiento(e.target.value)}
              disabled={!isActive || savingFin}
              title="Proporción de deuda respecto al patrimonio"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Razón de cobertura de intereses (ej. 16.26)"
              value={razonCoberturaIntereses}
              onChange={(e) => setRazonCoberturaIntereses(e.target.value)}
              disabled={!isActive || savingFin}
              title="Capacidad de pagar intereses"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="ROE - Rentabilidad patrimonio (ej. 0.14)"
              value={rentabilidadPatrimonio}
              onChange={(e) => setRentabilidadPatrimonio(e.target.value)}
              disabled={!isActive || savingFin}
              title="Rentabilidad del capital invertido"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="ROA - Rentabilidad activo (ej. 0.08)"
              value={rentabilidadActivo}
              onChange={(e) => setRentabilidadActivo(e.target.value)}
              disabled={!isActive || savingFin}
              title="Rentabilidad de los activos totales"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Cap. de deudas corto plazo (ej. 1.50)"
              value={capacidadDeudasCortoPlazo}
              onChange={(e) => setCapacidadDeudasCortoPlazo(e.target.value)}
              disabled={!isActive || savingFin}
              title="Límite de capacidad de deuda a corto plazo"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Porcentaje de acreedores (ej. 0.60)"
              value={porcentajeAcreedores}
              onChange={(e) => setPorcentajeAcreedores(e.target.value)}
              disabled={!isActive || savingFin}
              title="Proporción máxima de acreedores"
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Retribución riesgo propiedad (ej. 0.10)"
              value={retribucionRiesgoPropiedad}
              onChange={(e) => setRetribucionRiesgoPropiedad(e.target.value)}
              disabled={!isActive || savingFin}
              title="Retorno mínimo esperado del riesgo"
            />
            <input
              type="number" step="any"
              className="preferences-input preferences-grid-full"
              placeholder="Capacidad de generar ganancias (ej. 0.05)"
              value={capacidadGenerarGanancias}
              onChange={(e) => setCapacidadGenerarGanancias(e.target.value)}
              disabled={!isActive || savingFin}
              title="Capacidad mínima de generar ganancias"
            />
          </div>
        </div>

        <div className="preferences-button-group">
          <button
            onClick={saveAll}
            className="preferences-button preferences-button-primary"
            disabled={!isActive || !email || savingFin || saving}
          >
            {savingFin || saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>

        {(msgFin || msg) && (
          <p className={`preferences-status-message ${(msgFin || msg).includes("❌") || (msgFin || msg).includes("Error") ? "preferences-status-error" : "preferences-status-success"}`}>
            {msgFin || msg}
          </p>
        )}
      </div>

      {/* Suscripciones */}
      <div className="preferences-sub-list">
        <h4 className="preferences-sub-title">Tus suscripciones</h4>

        {loadingSubs ? (
          <p className="preferences-loading-text">Cargando suscripciones…</p>
        ) : subs.length === 0 ? (
          <p className="preferences-loading-text">No tienes suscripciones activas.</p>
        ) : (
          <ul>
            {subs.map((s) => (
              <li key={s.id} className="preferences-sub-item">
                <div>
                  <div className="preferences-sub-item-name">
                    {s.palabras_clave}{" "}
                    {s.departamento ? `• ${s.departamento}` : ""}{" "}
                    {s.ciudad ? `• ${s.ciudad}` : ""}
                  </div>
                  <div className="preferences-sub-item-meta">
                    Último envío: {s.last_notified_at || "—"} • Activa: {s.is_active ? "Sí" : "No"}
                  </div>
                </div>
                {s.is_active ? (
                  <button
                    onClick={() => deactivate(s.id)}
                    className="preferences-sub-item-button"
                    disabled={!isActive}
                  >
                    Desactivar
                  </button>
                ) : (
                  <span className="preferences-sub-item-meta">Inactiva</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
