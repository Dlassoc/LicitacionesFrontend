import React from "react";
import Header from "../components/Header.jsx";
import Preferences from "./Preferences.jsx";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header chips={[]} />

      <main className="flex-1 pt-20 px-4 md:px-8 lg:px-12 pb-8">
        <div className="max-w-5xl mx-auto">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold">Preferencias y suscripciones</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configura palabras clave y filtros; y, si lo deseas, guarda los indicadores
                financieros (solo valores) para tus análisis internos.
              </p>
            </header>

            <Preferences unlocked={true} />
          </section>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-gray-50">
        © {new Date().getFullYear()} Emergente Energía Sostenible
      </footer>
    </div>
  );
}
