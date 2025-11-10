import React from "react";
import Header from "../components/Header.jsx";
import Preferences from "./Preferences.jsx";
import "../styles/pages/preferences-page.css";

export default function PreferencesPage() {
  return (
    <div className="preferences-page-container">
      <Header chips={[]} />

      <main className="preferences-page-main">
        <div className="preferences-page-content-wrapper">
          <section className="preferences-page-section">
            <header className="preferences-page-header">
              <h1 className="preferences-page-title">Preferencias y suscripciones</h1>
              <p className="preferences-page-description">
                Configura palabras clave y filtros; y, si lo deseas, guarda los indicadores
                financieros (solo valores) para tus análisis internos.
              </p>
            </header>

            <Preferences unlocked={true} />
          </section>
        </div>
      </main>

      <footer className="preferences-page-footer">
        © {new Date().getFullYear()} Emergente Energía Sostenible
      </footer>
    </div>
  );
}
