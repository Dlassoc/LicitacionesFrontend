import React, { useState, useEffect, useMemo, useCallback } from "react";

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
    <div className="mt-6 p-4 border rounded-lg bg-white max-w-3xl relative">
      {!isActive && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
          <div className="text-center px-6">
            <p className="font-medium text-gray-800">
              Para configurar tus preferencias, realiza primero una búsqueda.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Si ya tienes suscripciones guardadas, esta sección se activará automáticamente.
            </p>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold mb-2">Preferencias y suscripciones</h3>

      {loadingSession ? (
        <p className="text-sm text-gray-500 mb-2">Cargando sesión…</p>
      ) : msg && !email ? (
        <p className="text-sm text-red-600 mb-2">{msg}</p>
      ) : null}

      {/* Identidad */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Nombre</label>
          <input
            className="border p-2 rounded"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isActive}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Correo</label>
          <div
            className="border p-2 rounded bg-gray-50 text-gray-700"
            title="Este correo proviene de tu sesión"
          >
            {email || "—"}
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          className="border p-2 rounded md:col-span-2"
          placeholder="Palabras clave (ej. acueducto, energía)"
          value={palabras}
          onChange={(e) => setPalabras(e.target.value)}
          disabled={!isActive}
        />
        <input
          className="border p-2 rounded"
          placeholder="Departamento (opcional)"
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          disabled={!isActive}
        />
        <input
          className="border p-2 rounded"
          placeholder="Ciudad (opcional)"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          disabled={!isActive}
        />

        {/* Indicadores financieros (debajo de Departamento/Ciudad) */}
        <div className="md:col-span-2 mt-2">
          <h4 className="font-semibold mb-2">Indicadores financieros (opcional)</h4>
          <p className="text-xs text-gray-500 mb-3">
            Ingresa solo valores numéricos. Se guardarán únicamente los campos que tengan valor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Indicador de liquidez (ej. 5.13)"
              value={indicadorLiquidez}
              onChange={(e) => setIndicadorLiquidez(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Nivel de endeudamiento (ej. 0.42)"
              value={nivelEndeudamiento}
              onChange={(e) => setNivelEndeudamiento(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Razón de cobertura de intereses (ej. 16.26)"
              value={razonCoberturaIntereses}
              onChange={(e) => setRazonCoberturaIntereses(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="ROE - Rent. patrimonio (ej. 0.14)"
              value={rentabilidadPatrimonio}
              onChange={(e) => setRentabilidadPatrimonio(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="ROA - Rent. activo (ej. 0.08)"
              value={rentabilidadActivo}
              onChange={(e) => setRentabilidadActivo(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Cap. de deudas corto plazo (límite, ej. 1.50)"
              value={capacidadDeudasCortoPlazo}
              onChange={(e) => setCapacidadDeudasCortoPlazo(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Porcentaje de acreedores (límite, ej. 0.60)"
              value={porcentajeAcreedores}
              onChange={(e) => setPorcentajeAcreedores(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded"
              placeholder="Retribución riesgo propiedad (límite ROE, ej. 0.10)"
              value={retribucionRiesgoPropiedad}
              onChange={(e) => setRetribucionRiesgoPropiedad(e.target.value)}
              disabled={!isActive || savingFin}
            />
            <input
              type="number" step="any"
              className="border p-2 rounded md:col-span-2"
              placeholder="Capacidad de generar ganancias (límite ROA, ej. 0.05)"
              value={capacidadGenerarGanancias}
              onChange={(e) => setCapacidadGenerarGanancias(e.target.value)}
              disabled={!isActive || savingFin}
            />
          </div>

          <div className="mt-3">
            <button
              onClick={saveFin}
              className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!isActive || savingFin}
            >
              {savingFin ? "Guardando…" : "Guardar indicadores"}
            </button>
            {msgFin && <p className="text-sm mt-2 text-gray-600">{msgFin}</p>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          className="bg-blue-900 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={!isActive || !email || saving}
        >
          {saving ? "Guardando…" : "Guardar intereses"}
        </button>
        <button
          onClick={runNow}
          className="border px-4 py-2 rounded disabled:opacity-50"
          disabled={!isActive || !email || running}
        >
          {running ? "Ejecutando…" : "Probar envío ahora"}
        </button>
      </div>

      {msg && email && <p className="text-sm mt-2 text-gray-600">{msg}</p>}

      {/* Suscripciones */}
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Tus suscripciones</h4>

        {loadingSubs ? (
          <p className="text-sm text-gray-500">Cargando suscripciones…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-gray-500">No tienes suscripciones activas.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="text-sm border rounded p-3 flex justify-between items-center">
                <div>
                  <div>
                    <b>{s.palabras_clave}</b>{" "}
                    {s.departamento ? `• ${s.departamento}` : ""}{" "}
                    {s.ciudad ? `• ${s.ciudad}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Último envío: {s.last_notified_at || "—"} • Activa: {s.is_active ? "Sí" : "No"}
                  </div>
                </div>
                {s.is_active ? (
                  <button
                    onClick={() => deactivate(s.id)}
                    className="text-red-600 text-xs underline disabled:opacity-50"
                    disabled={!isActive}
                  >
                    Desactivar
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Inactiva</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
