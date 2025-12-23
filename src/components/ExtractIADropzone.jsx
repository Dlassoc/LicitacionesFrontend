import React, { useRef, useState } from "react";
import ExtractIAResults from "./ExtractIAResults.jsx";
import { API_ENDPOINTS } from "../config/api.js";
import "../styles/components/extract-ia-dropzone.css";

export default function ExtractIADropzone() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(null); // 'ia' o 'local'
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(""); // Mensaje detallado de estado
  const dropzoneRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.add("drag-active");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("drag-active");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("drag-active");

    const files = e.dataTransfer.files;
    showAnalysisOptions(files);
  };

  const handleInputChange = (e) => {
    showAnalysisOptions(e.target.files);
  };

  const showAnalysisOptions = (files) => {
    const validFiles = Array.from(files).filter((f) => 
      f.type === "application/pdf" || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    
    if (validFiles.length === 0) {
      alert("Por favor, selecciona al menos un archivo PDF o DOCX");
      return;
    }

    setSelectedFiles(validFiles);
    setAnalysisMode(null); // Reset mode for selection
  };

  const processFiles = async (mode) => {
    if (!selectedFiles) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setAnalysisMode(mode);
    setProcessingStatus("Iniciando análisis...");

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      // Seleccionar endpoint basado en modo
      const endpoint = mode === 'local' 
        ? API_ENDPOINTS.EXTRACT_ANALYZE_LOCAL 
        : API_ENDPOINTS.EXTRACT_ANALYZE;

      // Mostrar mensaje inicial
      if (mode === 'local') {
        setProcessingStatus(" Extrayendo texto del documento...");
      } else {
        setProcessingStatus(" Enviando a IA para análisis profundo...");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      
      // Verificar si se usó OCR en algún item
      const usedOcr = data.items?.some(item => item.ocr_usado);
      
      if (usedOcr) {
        // Agregar advertencia de ambigüedad a los resultados
        data.ocr_warning = true;
        data.ocr_message = " Este documento contiene imágenes y fue procesado con OCR. Los valores pueden ser ambiguos. Por favor, verifica los indicadores manualmente.";
      }
      
      setResults(data);
      setProcessingStatus("");
    } catch (err) {
      setError(err.message || "Error al procesar archivos");
      console.error("Error:", err);
      setProcessingStatus("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setSelectedFiles(null);
    setAnalysisMode(null);
  };

  if (results) {
    return (
      <div className="extract-ia-dropzone-scrollbar-thin">
        <ExtractIAResults data={results} onReset={handleReset} />
      </div>
    );
  }

  // Mostrar opciones de análisis si hay archivos seleccionados
  if (selectedFiles && !loading) {
    return (
      <div className="extract-ia-dropzone-container">
        <div className="extract-ia-dropzone-options">
          <div className="extract-ia-dropzone-options-header">
            <p className="extract-ia-dropzone-options-title">
              {selectedFiles.length} archivo{selectedFiles.length !== 1 ? "s" : ""} seleccionado{selectedFiles.length !== 1 ? "s" : ""}
            </p>
            <p className="extract-ia-dropzone-options-subtitle">
              Elige el método de análisis:
            </p>
          </div>

          <div className="extract-ia-dropzone-options-grid">
            {/* Opción Local */}
            <button
              onClick={() => processFiles('local')}
              className="extract-ia-dropzone-option-button local"
              disabled={loading}
            >
              <div className="extract-ia-dropzone-option-icon"></div>
              <div className="extract-ia-dropzone-option-content">
                <h3 className="extract-ia-dropzone-option-title">Análisis Local</h3>
                <p className="extract-ia-dropzone-option-description">
                  Rápido, privado, sin costo
                </p>
                <ul className="extract-ia-dropzone-option-features">
                  <li> Instantáneo</li>
                  <li> Privado</li>
                  <li> Gratis</li>
                </ul>
              </div>
            </button>

            {/* Opción IA */}
            <button
              onClick={() => processFiles('ia')}
              className="extract-ia-dropzone-option-button ia"
              disabled={loading}
            >
              <div className="extract-ia-dropzone-option-icon"></div>
              <div className="extract-ia-dropzone-option-content">
                <h3 className="extract-ia-dropzone-option-title">Análisis con IA</h3>
                <p className="extract-ia-dropzone-option-description">
                  Más preciso, análisis profundo
                </p>
                <ul className="extract-ia-dropzone-option-features">
                  <li> Detallado</li>
                  <li> Preciso</li>
                  <li> Lento</li>
                </ul>
              </div>
            </button>
          </div>

          <button
            onClick={handleReset}
            className="extract-ia-dropzone-cancel-button"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="extract-ia-dropzone-container">
      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="extract-ia-dropzone-zone"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          onChange={handleInputChange}
          disabled={loading}
          className="extract-ia-dropzone-input"
        />

        <div className="extract-ia-dropzone-content">
          <div className="extract-ia-dropzone-icon"></div>
          <div className="extract-ia-dropzone-text-wrapper">
            <p className="extract-ia-dropzone-title">
              {loading ? "Procesando documentos…" : "Arrastra archivos PDF o DOCX aquí"}
            </p>
            <p className="extract-ia-dropzone-subtitle">
              o haz clic para seleccionar
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="extract-ia-dropzone-error">
          <p className="extract-ia-dropzone-error-text"> {error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="extract-ia-dropzone-loading">
          <div className="extract-ia-dropzone-loading-spinner"></div>
          <p className="extract-ia-dropzone-loading-text">
            {processingStatus || (analysisMode === 'local' ? 'Análisis local en progreso...' : 'Análisis con IA en progreso...')}
          </p>
          {analysisMode === 'local' && (
            <p className="extract-ia-dropzone-loading-subtext">
               Esto puede tomar unos momentos. Por favor, espera...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
