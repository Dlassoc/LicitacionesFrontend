import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function Preferences({ unlocked = true }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [palabras, setPalabras] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");

  const [sessionMsg, setSessionMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [subs, setSubs] = useState([]);

  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const hasSavedSubs = subs.length > 0;
  const isActive = useMemo(() => unlocked || hasSavedSubs, [unlocked, hasSavedSubs]);

  const safeJson = async (res) => { try { return await res.json(); } catch { return {}; } };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(d);
    } catch { return iso; }
  };

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionMsg("");
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { method: "GET", credentials: "include" });
      if (!r.ok) {
        setSessionMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
        setEmail(""); setName(""); return;
      }
      const data = await safeJson(r);
      setEmail(data?.email || "");
      setName(data?.name || "");
    } catch {
      setSessionMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
      setEmail(""); setName("");
    } finally { setLoadingSession(false); }
  }, []);

  const loadSubs = useCallback(async (em) => {
    if (!em) { setSubs([]); return; }
    setLoadingSubs(true);
    try {
      const r = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(em)}`, {
        credentials: "include",
      });
      if (!r.ok) { setSubs([]); return; }
      const data = await safeJson(r);
      setSubs(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch { setSubs([]); }
    finally { setLoadingSubs(false); }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { if (email) loadSubs(email); }, [email, loadSubs]);

  const inputBase =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:text-gray-500";
  const labelBase = "text-xs font-medium text-gray-700";

  const save = async () => {
    setActionMsg("");
    if (!email) { setActionMsg("No hay correo de sesión. Inicia sesión para guardar tus preferencias."); return; }
    if (!palabras.trim()) { setActionMsg("Escribe al menos una palabra clave."); return; }
    setSaving(true);
    try {
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
      const rSub = await fetch(`${API_BASE}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          palabras_clave: palabras.trim(),
          departamento: departamento.trim(),
          ciudad: ciudad.trim(),
        }),
      });
      const data = await safeJson(rSub);
      if (!rSub.ok || data?.ok === false) throw new Error(data?.error || "Error al guardar suscripción");
      await loadSubs(email);
      setActionMsg("Intereses guardados. Te enviaremos novedades automáticamente.");
    } catch (e) {
      setActionMsg("Error: " + (e.message || "No se pudo guardar"));
    } finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!id) return;
    try {
      await fetch(`${API_BASE}/subscriptions/${id}/deactivate`, {
        method: "POST",
        credentials: "include",
      });
    } finally { await loadSubs(email); }
  };

  const runNow = async () => {
    if (!email) { setActionMsg("No hay correo de sesión. Inicia sesión para probar el envío."); return; }
    setRunning(true);
    try {
      const url = `${API_BASE}/subscriptions/run-digest-now?email=${encodeURIComponent(email)}&days_back=7&force=true`;
      const res = await fetch(url, { method: "POST", credentials: "include" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "No se pudo ejecutar el envío manual");
      const itemsCount =
        typeof data.items === "number" ? data.items :
        typeof data.items_untrimmed === "number" ? data.items_untrimmed : 0;
      setActionMsg(`Se ejecutó el envío: emails_sent=${data.emails_sent ?? "?"}, items=${itemsCount}. Revisa tu correo.`);
    } catch (e) {
      setActionMsg("No se pudo ejecutar el envío manual. " + (e.message || ""));
    } finally { setRunning(false); }
  };

  return (
    <div className="relative">
      {!isActive && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <div className="text-center px-6">
            <p className="font-medium text-gray-800">Para configurar tus preferencias, realiza primero una búsqueda.</p>
            <p className="text-sm text-gray-500 mt-1">
              Si ya tienes suscripciones guardadas, esta sección se activará automáticamente.
            </p>
          </div>
        </div>
      )}

      {loadingSession ? (
        <p className="text-sm text-gray-500 mb-4">Cargando sesión…</p>
      ) : sessionMsg && !email ? (
        <p className="text-sm text-red-600 mb-4">{sessionMsg}</p>
      ) : null}

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className={labelBase}>Nombre</label>
          <input
            id="nombre"
            className={inputBase}
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isActive}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="correo" className={labelBase}>Correo</label>
          <input
            id="correo"
            className={inputBase + " bg-gray-50"}
            value={email || ""}
            readOnly
            placeholder="—"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex flex-col gap-1">
          <label htmlFor="palabras" className={labelBase}>Palabras clave</label>
          <input
            id="palabras"
            className={inputBase}
            placeholder="Ej. acueducto, energía"
            value={palabras}
            onChange={(e) => setPalabras(e.target.value)}
            disabled={!isActive}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="depto" className={labelBase}>Departamento (opcional)</label>
          <input
            id="depto"
            className={inputBase}
            placeholder="Departamento"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            disabled={!isActive}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ciudad" className={labelBase}>Ciudad (opcional)</label>
          <input
            id="ciudad"
            className={inputBase}
            placeholder="Ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            disabled={!isActive}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={save}
          className="inline-flex items-center justify-center rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:hover:bg-blue-700"
          disabled={!isActive || !email || saving}
        >
          {saving ? "Guardando…" : "Guardar intereses"}
        </button>

        <button
          onClick={runNow}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={!isActive || !email || running}
        >
          {running ? "Ejecutando…" : "Probar envío ahora"}
        </button>
      </div>

      {actionMsg && email && <p className="text-sm mt-3 text-gray-700">{actionMsg}</p>}

      <div className="mt-6">
        <h4 className="font-semibold text-gray-900 mb-2">Tus suscripciones</h4>

        {loadingSubs ? (
          <p className="text-sm text-gray-500">Cargando suscripciones…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-gray-600">No tienes suscripciones activas.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="text-sm ring-1 ring-gray-200 rounded-lg p-3 flex justify-between items-center bg-white">
                <div>
                  <div className="text-gray-900">
                    <span className="font-medium">{s.palabras_clave}</span>{" "}
                    {s.departamento ? `• ${s.departamento}` : ""}{" "}
                    {s.ciudad ? `• ${s.ciudad}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Último envío: {formatDate(s.last_notified_at)} • Activa: {s.is_active ? "Sí" : "No"}
                  </div>
                </div>
                {s.is_active ? (
                  <button
                    onClick={() => deactivate(s.id)}
                    className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-50"
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
