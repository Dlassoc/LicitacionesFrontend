import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../styles/components/preferences.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Preferences({ unlocked = true }) {
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

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (email) loadSubs(email);
  }, [email, loadSubs]);

  const save = async () => {
    setMsg("");
    if (!email) {
      setMsg("No hay correo de sesión. Inicia sesión para guardar tus preferencias.");
      return;
    }
    setSaving(true);
    try {
      // upsert usuario
      const rUser = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name }),
      });
      if (!rUser.ok) {
        const je = await safeJson(rUser);
        throw new Error(je?.error || "No se pudo guardar el usuario");
      }

      // crear/actualizar suscripción
      const rSub = await fetch(`${API_BASE}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          palabras_clave: palabras,
          departamento,
          ciudad,
        }),
      });
      const data = await safeJson(rSub);
      if (!rSub.ok || data?.ok === false) {
        throw new Error(data?.error || "Error al guardar suscripción");
      }

      await loadSubs(email);
      setMsg("Intereses guardados. Te enviaremos novedades automáticamente.");
    } catch (e) {
      setMsg("Error: " + (e.message || "No se pudo guardar"));
    } finally {
      setSaving(false);
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
        setMsgFin("No hay valores para guardar.");
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

      setMsgFin(`Indicadores guardados (id=${data.id}).`);
    } catch (e) {
      setMsgFin("No se pudieron guardar los indicadores: " + (e.message || ""));
    } finally {
      setSavingFin(false);
    }
  };

  return (
    <div className="preferences-wrapper">
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

      <h3 className="preferences-title">Preferencias y suscripciones</h3>

      {loadingSession ? (
        <p className="preferences-loading-text">Cargando sesión…</p>
      ) : msg && !email ? (
        <p className="preferences-error-text">{msg}</p>
      ) : null}

      {/* Identidad */}
      <div className="preferences-grid">
        <div className="preferences-field-group">
          <label className="preferences-field-label">Nombre</label>
          <input
            className="preferences-input"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isActive}
          />
        </div>
        <div className="preferences-field-group">
          <label className="preferences-field-label">Correo</label>
          <div
            className="preferences-display"
            title="Este correo proviene de tu sesión"
          >
            {email || "—"}
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="preferences-grid">
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
        <div className="preferences-grid-full" style={{ marginTop: '0.5rem' }}>
          <h4 className="preferences-section-title">Indicadores financieros (opcional)</h4>
          <p className="preferences-section-description">
            Ingresa solo valores numéricos. Se guardarán únicamente los campos que tengan valor.
          </p>

          <div className="preferences-financial-grid">
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Indicador de liquidez (ej. 5.13)"
              value={indicadorLiquidez}
              onChange={(e) => setIndicadorLiquidez(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Nivel de endeudamiento (ej. 0.42)"
              value={nivelEndeudamiento}
              onChange={(e) => setNivelEndeudamiento(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Razón de cobertura de intereses (ej. 16.26)"
              value={razonCoberturaIntereses}
              onChange={(e) => setRazonCoberturaIntereses(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="ROE - Rent. patrimonio (ej. 0.14)"
              value={rentabilidadPatrimonio}
              onChange={(e) => setRentabilidadPatrimonio(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="ROA - Rent. activo (ej. 0.08)"
              value={rentabilidadActivo}
              onChange={(e) => setRentabilidadActivo(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Cap. de deudas corto plazo (límite, ej. 1.50)"
              value={capacidadDeudasCortoPlazo}
              onChange={(e) => setCapacidadDeudasCortoPlazo(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Porcentaje de acreedores (límite, ej. 0.60)"
              value={porcentajeAcreedores}
              onChange={(e) => setPorcentajeAcreedores(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input"
              placeholder="Retribución riesgo propiedad (límite ROE, ej. 0.10)"
              value={retribucionRiesgoPropiedad}
              onChange={(e) => setRetribucionRiesgoPropiedad(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="preferences-input preferences-grid-full"
              placeholder="Capacidad de generar ganancias (límite ROA, ej. 0.05)"
              value={capacidadGenerarGanancias}
              onChange={(e) => setCapacidadGenerarGanancias(e.target.value)}
              disabled={!isActive || savingFin}
            />
          </div>

          <div className="preferences-button-group">
            <button
              onClick={saveFin}
              className="preferences-button preferences-button-primary"
              disabled={!isActive || savingFin}
            >
              {savingFin ? "Guardando…" : "Guardar indicadores"}
            </button>
            {msgFin && <p className="preferences-status-message preferences-status-success">{msgFin}</p>}
          </div>
        </div>
      </div>

      <div className="preferences-button-group">
        <button
          onClick={save}
          className="preferences-button preferences-button-primary"
          disabled={!isActive || !email || saving}
        >
          {saving ? "Guardando…" : "Guardar intereses"}
        </button>
        <button
          onClick={runNow}
          className="preferences-button"
          disabled={!isActive || !email || running}
        >
          {running ? "Ejecutando…" : "Probar envío ahora"}
        </button>
      </div>

      {msg && email && <p className="preferences-status-message preferences-status-success">{msg}</p>}

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
