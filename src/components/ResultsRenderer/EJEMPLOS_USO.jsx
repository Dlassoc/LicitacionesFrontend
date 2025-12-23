/**
 * Ejemplo de Uso: ResultsRenderer
 * 
 * Este archivo muestra cómo integrar ResultsRenderer en diferentes contextos
 */

// ============================================================================
// EJEMPLO 1: Uso básico en ExtractIAResults (ACTUAL)
// ============================================================================

import React from "react";
import { ResultsRenderer } from "./ResultsRenderer";

export default function ExtractIAResults({ data, onReset }) {
  return (
    <div className="extract-ia-results-wrapper">
      <ResultsRenderer results={data} onBack={onReset} />
    </div>
  );
}

// ============================================================================
// EJEMPLO 2: Con procesamiento adicional
// ============================================================================

import React, { useState, useEffect } from "react";
import { ResultsRenderer } from "./ResultsRenderer";

export default function AdvancedResults({ rawData, onReset }) {
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Procesamiento adicional si es necesario
    if (rawData) {
      const processed = {
        ...rawData,
        items: rawData.items.map(item => ({
          ...item,
          // Agregar campos adicionales aquí
          procesado_en: new Date().toLocaleString('es-CO'),
        }))
      };
      setProcessedData(processed);
      setLoading(false);
    }
  }, [rawData]);

  if (loading) return <div>Cargando resultados...</div>;

  return <ResultsRenderer results={processedData} onBack={onReset} />;
}

// ============================================================================
// EJEMPLO 3: Con filtros
// ============================================================================

import React, { useState } from "react";
import { ResultsRenderer } from "./ResultsRenderer";

export default function FilteredResults({ data, onReset }) {
  const [filter, setFilter] = useState("all"); // all, success, error, ocr

  const filteredData = {
    ...data,
    items: data.items.filter(item => {
      if (filter === "success") return item.ok;
      if (filter === "error") return !item.ok;
      if (filter === "ocr") return item.ocr_usado;
      return true;
    })
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label>Filtrar: </label>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="success">Exitosos</option>
          <option value="error">Errores</option>
          <option value="ocr">Con OCR</option>
        </select>
      </div>
      <ResultsRenderer results={filteredData} onBack={onReset} />
    </div>
  );
}

// ============================================================================
// EJEMPLO 4: Con exportación
// ============================================================================

import React from "react";
import { ResultsRenderer } from "./ResultsRenderer";

export default function ExportableResults({ data, onReset }) {
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultados-${Date.now()}.json`;
    link.click();
  };

  const handleExportCSV = () => {
    // Extraer datos de indicadores
    let csv = "Archivo,Indicador,Valor,Confianza,OCR Usado\n";
    
    data.items?.forEach(item => {
      if (item.ok && item.resultado?.indicadores_financieros) {
        Object.entries(item.resultado.indicadores_financieros).forEach(([nombre, valor]) => {
          csv += `${item.archivo},${nombre},${valor},${item.resultado.confianza || 'N/A'},${item.ocr_usado ? 'Sí' : 'No'}\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultados-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleExportJSON} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          📥 Descargar JSON
        </button>
        <button onClick={handleExportCSV} style={{ padding: '10px 20px', background: '#66bb6a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          📊 Descargar CSV
        </button>
      </div>
      <ResultsRenderer results={data} onBack={onReset} />
    </div>
  );
}

// ============================================================================
// EJEMPLO 5: Estructura esperada de datos
// ============================================================================

const EJEMPLO_RESPONSE = {
  ok: true,
  items: [
    // Éxito
    {
      ok: true,
      archivo: "documento_prueba.pdf",
      tipo: "PDF",
      paginas_totales: 23,
      ocr_usado: false,
      resultado: {
        indicadores_financieros: {
          liquidez_corriente: ">= 1,50",
          endeudamiento: "<= 75%",
          cobertura_intereses: ">= 0,00",
          rentabilidad_patrimonio: ">= 0,00",
          rentabilidad_activo: ">= 0,00"
        },
        codigos_unspsc: [
          "30101500",
          "39000000",
          "49000000"
        ],
        confianza: 0.95,
        items_encontrados: 5,
        metodo: "extraccion_local"
      }
    },
    // Con OCR
    {
      ok: true,
      archivo: "documento_imagen.pdf",
      tipo: "PDF",
      paginas_totales: 56,
      ocr_usado: true,  // ← IMPORTANTE
      resultado: {
        indicadores_financieros: {
          liquidez_corriente: ">= 1,11",
          endeudamiento: "<= 75%"
        },
        codigos_unspsc: ["30101500"],
        confianza: 0.75,
        items_encontrados: 2,
        metodo: "extraccion_local"
      }
    },
    // Error
    {
      ok: false,
      archivo: "documento_corrompido.pdf",
      error: "El archivo está corrompido o no se puede leer"
    },
    // Descartado
    {
      ok: false,
      archivo: "documento_irrelevante.pdf",
      motivo: "Documento descartado automáticamente",
      razon: "No contiene indicadores financieros relevantes"
    }
  ],
  metodo: "extraccion_local",
  ocr_warning: true,  // ← Agregado si hay OCR
  ocr_message: "⚠️ Este documento contiene imágenes y fue procesado con OCR. Los valores pueden ser ambiguos. Por favor, verifica los indicadores manualmente."
};

// ============================================================================
// EJEMPLO 6: Hook personalizado para manejar resultados
// ============================================================================

import { useState, useCallback } from "react";

export function useExtractResults() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extractFiles = useCallback(async (files) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));

      const response = await fetch("/extract_ia/analyze-local", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Error al procesar archivos");

      const data = await response.json();
      setResults(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, loading, error, extractFiles, reset };
}

// Uso del hook:
// const { results, loading, error, extractFiles, reset } = useExtractResults();
// await extractFiles([file1, file2]);
// <ResultsRenderer results={results} onBack={reset} />

// ============================================================================
// NOTAS IMPORTANTES
// ============================================================================

/*
1. ESTRUCTURA DE DATOS ESPERADA:
   - results.items debe ser un array
   - Cada item debe tener: ok, archivo, y si ok=true: tipo, paginas_totales, resultado

2. CAMPOS OPCIONALES:
   - ocr_usado: boolean (agregado automáticamente por backend)
   - motivo: string (para documentos descartados)
   - razon: string (razón del descarte)
   - error: string (mensaje de error)

3. TEMA OSCURO:
   - Requiere: <html data-theme="dark">
   - O: document.documentElement.setAttribute("data-theme", "dark")

4. RESPONSIVE:
   - Funciona automáticamente en móvil
   - Ajusta columnas según pantalla

5. ACCESIBILIDAD:
   - Usa semantic HTML
   - Soporta navegación con teclado
   - Compatible con lectores de pantalla
*/
