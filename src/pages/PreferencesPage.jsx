import React from "react";
import Header from "../components/Header.jsx";
import Preferences from "../Preferences.jsx";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header chips={[]} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold mb-3">Preferencias y suscripciones</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configura tus palabras clave y filtros. Te enviaremos novedades al correo de tu sesión.
        </p>
        <Preferences unlocked={true} />
      </div>
    </div>
  );
}
