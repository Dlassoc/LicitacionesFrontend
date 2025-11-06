import React, { useState } from "react";
import ExtractIADropzone from "./ExtractIADropzone.jsx";
import ExtractIAResults from "./ExtractIAResults.jsx";
import { API_ENDPOINTS } from "../config/api.js";

export default function ExtractIAForm() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      // Llamar al endpoint del backend
      const response = await fetch(API_ENDPOINTS.EXTRACT_ANALYZE, {
        method: "POST",
        body: formData,
        // No setear Content-Type para que el navegador lo haga automáticamente con boundary
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
      <ExtractIADropzone onFilesSelected={handleFilesSelected} loading={loading} error={error} />
    </div>
  );
}
