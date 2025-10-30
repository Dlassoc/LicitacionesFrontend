import React from "react";
import Header from "../components/Header.jsx";
import Preferences from "./Preferences.jsx";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Header siempre visible */}
      <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
        <Header chips={[]} />
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200">
          <div className="px-6 sm:px-8 pt-6">
            <h1 className="text-2xl font-semibold tracking-tight">Preferencias y suscripciones</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configura palabras clave y filtros; te enviaremos novedades al correo de tu sesión.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <Preferences unlocked={true} />
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500 py-8">
          © {new Date().getFullYear()} Emergente Energía Sostenible
        </footer>
      </main>
    </div>
  );
}
