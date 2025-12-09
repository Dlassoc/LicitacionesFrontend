import React, { useState } from 'react';

/**
 * Componente para formulario de upload y análisis de documentos
 * 
 * Props:
 * - onSubmit: Función llamada al enviar el formulario con { files }
 * - isLoading: Si está en proceso
 */
export function AnalysisForm({ onSubmit, isLoading = false }) {
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length > 0) {
      onSubmit({ files });
      setFiles([]);
    }
  };

  return (
    <div className="analysis-form-container">
      <div className="analysis-form">
        <h1>🧪 Test - Análisis de Documentos</h1>
        <p>Sube uno o más archivos PDF o DOCX para extraer indicadores financieros, códigos UNSPSC y requisitos de experiencia.</p>

        <div className="info-box">
          <strong>ℹ️ Información:</strong>
          <ul>
            <li>El sistema extrae indicadores financieros (Liquidez, ROA, ROE, etc.)</li>
            <li>También busca códigos UNSPSC (8 dígitos)</li>
            <li>Y requisitos de experiencia requerida del proponente</li>
            <li>Los documentos administrativos se saltan automáticamente</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="files">
              Selecciona uno o más archivos (PDF o DOCX):
            </label>
            <input
              type="file"
              id="files"
              multiple
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={isLoading}
              required
            />
          </div>

          {files.length > 0 && (
            <div className="files-preview">
              <strong>Archivos seleccionados ({files.length}):</strong>
              <ul>
                {files.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || files.length === 0}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? '⏳ Analizando...' : '📤 Analizar Archivos'}
          </button>
        </form>
      </div>

      <style>{`
        .analysis-form-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .analysis-form {
          max-width: 900px;
          width: 100%;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .analysis-form h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }

        .analysis-form p {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
          line-height: 1.6;
        }

        .info-box {
          background: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.6;
        }

        .info-box strong {
          display: block;
          margin-bottom: 8px;
          color: #0d47a1;
        }

        .info-box ul {
          margin-left: 20px;
          color: #555;
        }

        .info-box li {
          margin-bottom: 6px;
        }

        .form-group {
          margin: 15px 0;
        }

        .form-group label {
          display: block;
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
          font-size: 14px;
        }

        .form-group input[type="file"] {
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          width: 100%;
          font-size: 14px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .form-group input[type="file"]:hover {
          border-color: #667eea;
        }

        .form-group input[type="file"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input[type="file"]:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .files-preview {
          background: #f0f7ff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }

        .files-preview strong {
          display: block;
          margin-bottom: 10px;
          color: #333;
        }

        .files-preview ul {
          list-style: none;
          margin: 0;
          padding-left: 0;
        }

        .files-preview li {
          padding: 5px 0;
          color: #666;
          font-size: 14px;
          padding-left: 20px;
          position: relative;
        }

        .files-preview li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #4caf50;
          font-weight: bold;
        }

        button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          width: 100%;
          margin-top: 10px;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        button.loading {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .analysis-form {
            padding: 20px;
          }

          .analysis-form h1 {
            font-size: 24px;
          }

          .analysis-form p {
            font-size: 14px;
          }

          button {
            padding: 10px 20px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .analysis-form {
            padding: 15px;
          }

          .analysis-form h1 {
            font-size: 20px;
          }

          .analysis-form p {
            font-size: 13px;
          }

          .form-group input[type="file"] {
            padding: 10px;
            font-size: 12px;
          }

          .files-preview {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
