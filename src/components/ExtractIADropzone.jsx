import React, { useRef, useState } from "react";
import ExtractIAResults from "./ExtractIAResults.jsx";
import { API_ENDPOINTS } from "../config/api.js";
import "../styles/components/extract-ia-dropzone.css";

export default function ExtractIADropzone() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropzoneRef = useRef(null);
  const inputRef = useRef(null);

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
    processFiles(files);
  };

  const handleInputChange = (e) => {
    processFiles(e.target.files);
  };

  const processFiles = async (files) => {
    const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf");
    if (pdfFiles.length === 0) {
      alert("Por favor, selecciona al menos un archivo PDF");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      for (const file of pdfFiles) {
        formData.append("files", file);
      }

      const response = await fetch(API_ENDPOINTS.EXTRACT_ANALYZE, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Error al procesar archivos");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  if (results) {
    return (
      <div className="extract-ia-dropzone-scrollbar-thin">
        <ExtractIAResults data={results} onReset={handleReset} />
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
          accept=".pdf"
          onChange={handleInputChange}
          disabled={loading}
          className="extract-ia-dropzone-input"
        />

        <div className="extract-ia-dropzone-content">
          <div className="extract-ia-dropzone-icon">📄</div>
          <div className="extract-ia-dropzone-text-wrapper">
            <p className="extract-ia-dropzone-title">
              {loading ? "Procesando documentos…" : "Arrastra archivos PDF aquí"}
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
          <p className="extract-ia-dropzone-error-text">❌ {error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="extract-ia-dropzone-loading">
          <div className="extract-ia-dropzone-loading-spinner"></div>
        </div>
      )}
    </div>
  );
}
