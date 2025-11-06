import React, { useRef, useState } from "react";
import ExtractIAResults from "./ExtractIAResults.jsx";
import { API_ENDPOINTS } from "../config/api.js";

export default function ExtractIADropzone() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropzoneRef = useRef(null);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("border-blue-500", "bg-blue-50");

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
      <div className="scrollbar-thin">
        <ExtractIAResults data={results} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div>
      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition hover:border-gray-400 hover:bg-gray-50"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleInputChange}
          disabled={loading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {loading ? "Procesando documentos…" : "Arrastra archivos PDF aquí"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o haz clic para seleccionar
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
