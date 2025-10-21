import React, { useState, useEffect, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function Preferences({ unlocked = true }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [palabras, setPalabras] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");

  const [msg, setMsg] = useState("");
  const [subs, setSubs] = useState([]);

  const hasSavedSubs = subs.length > 0;
  const isActive = useMemo(() => unlocked || hasSavedSubs, [unlocked, hasSavedSubs]);

  const loadSession = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { method: "GET", credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setEmail(data?.email || "");
        setName(data?.name || "");
        setMsg("");
      } else {
        setMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
      }
    } catch {
      setMsg("No detecté sesión activa. Inicia sesión para autocompletar tu nombre y correo.");
    }
  };

  const loadSubs = async (em) => {
    if (!em) return setSubs([]);
    try {
      const r = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(em)}`, {
        credentials: "include",
      });
      const data = await r.json();
      setSubs(data.subscriptions || []);
    } catch {
      setSubs([]);
    }
  };

  useEffect(() => { loadSession(); }, []);
  useEffect(() => { if (email) loadSubs(email); }, [email]);

  const save = async () => {
    setMsg("");
    try {
      if (email) {
        await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, name }),
        });
      }

      const res = await fetch(`${API_BASE}/subscriptions`, {
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
      const data = await res.json();
      if (!data.ok) throw new Error("Error al guardar suscripción");
      await loadSubs(email);
      setMsg("Intereses guardados. Te enviaremos novedades automáticamente.");
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  };

  const deactivate = async (id) => {
    await fetch(`${API_BASE}/subscriptions/${id}/deactivate`, {
      method: "POST",
      credentials: "include",
    });
    await loadSubs(email);
  };

  const runNow = async () => {
    try {
      const url = `${API_BASE}/subscriptions/run-digest-now?email=${encodeURIComponent(email)}&days_back=7&force=true`;
      const res = await fetch(url, { method: "POST", credentials: "include" });
      const data = await res.json();
      const itemsCount =
        typeof data.items === "number"
          ? data.items
          : typeof data.items_untrimmed === "number"
          ? data.items_untrimmed
          : 0;
      setMsg(`Se ejecutó el envío: emails_sent=${data.emails_sent}, items=${itemsCount}. Revisa tu correo.`);
    } catch {
      setMsg("No se pudo ejecutar el envío manual.");
    }
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-white max-w-3xl relative">
      {!isActive && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
          <div className="text-center px-6">
            <p className="font-medium text-gray-800">Para configurar tus preferencias, realiza primero una búsqueda.</p>
            <p className="text-sm text-gray-500 mt-1">Si ya tienes suscripciones guardadas, esta sección se activará automáticamente.</p>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold mb-2">Preferencias y suscripciones</h3>

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
          <div className="border p-2 rounded bg-gray-50 text-gray-700" title="Este correo proviene de tu sesión">
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
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          className="bg-blue-900 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={!isActive || !email}
        >
          Guardar intereses
        </button>
        <button
          onClick={runNow}
          className="border px-4 py-2 rounded disabled:opacity-50"
          disabled={!isActive || !email}
        >
          Probar envío ahora
        </button>
      </div>

      {msg && <p className="text-sm mt-2 text-gray-600">{msg}</p>}

      <div className="mt-4">
        <h4 className="font-semibold mb-2">Tus suscripciones</h4>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500">No tienes suscripciones activas.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="text-sm border rounded p-3 flex justify-between items-center">
                <div>
                  <div>
                    <b>{s.palabras_clave}</b>{" "}
                    {s.departamento ? `• ${s.departamento}` : ""} {s.ciudad ? `• ${s.ciudad}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Último envío: {s.last_notified_at || "—"} • Activa: {s.is_active ? "Sí" : "No"}
                  </div>
                </div>
                {s.is_active ? (
                  <button onClick={() => deactivate(s.id)} className="text-red-600 text-xs underline" disabled={!isActive}>
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