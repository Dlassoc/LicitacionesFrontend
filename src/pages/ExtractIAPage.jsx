import React from "react";
import Header from "../components/Header.jsx";
import ExtractIADropzone from "../components/ExtractIADropzone.jsx";
import "../styles/pages/extract-ia-page.css";

export default function ExtractIAPage() {
  return (
    <div className="extract-ia-page-container">
      <Header chips={[]} />

      <main className="extract-ia-page-main">
        <div className="extract-ia-page-content-wrapper">
          <section className="extract-ia-page-section">
            <header className="extract-ia-page-header">
              <h1 className="extract-ia-page-title">Extractor de Requisitos con IA</h1>
              <p className="extract-ia-page-description">
                Carga documentos PDF de licitaciones para extraer automáticamente requisitos, 
                documentos requeridos e indicadores financieros usando IA.
              </p>
            </header>

            <ExtractIADropzone />
          </section>
        </div>
      </main>

      <footer className="extract-ia-page-footer">
        © {new Date().getFullYear()} Emergente Energía Sostenible
      </footer>
    </div>
  );
}
