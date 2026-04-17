import React from "react";
import { getFinalDateRange } from "../utils/dateHelpers.js";
import { DEPARTAMENTOS_COLOMBIA } from "./searchForm/locationData.js";
import { useSearchFormState } from "./searchForm/useSearchFormState.js";
import "../styles/features/search-form.css";

export default function SearchForm({ onBuscar, onClear }) {
  const {
    termino,
    setTermino,
    fechaPubDesde,
    setFechaPubDesde,
    fechaPubHasta,
    setFechaPubHasta,
    fechaManifDesde,
    setFechaManifDesde,
    fechaManifHasta,
    setFechaManifHasta,
    fechaRecDesde,
    setFechaRecDesde,
    fechaRecHasta,
    setFechaRecHasta,
    departamento,
    setDepartamento,
    ciudad,
    setCiudad,
    ciudadesFiltradas,
    fase,
    setFase,
    estado,
    setEstado,
    clearForm,
  } = useSearchFormState();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!termino || !termino.trim()) {
      console.warn("Por favor ingresa un término de búsqueda");
      return;
    }
    
    // Aplicar rango del mes actual si está vacío (BD actualizada)
    const { finalFechaRecDesde, finalFechaRecHasta } = getFinalDateRange(fechaRecDesde, fechaRecHasta);
    
    onBuscar(termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, finalFechaRecDesde, finalFechaRecHasta, ciudad, departamento, fase, estado);
  };

  const handleClear = () => {
    clearForm();
    onClear?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="search-form-wrapper"
    >
      <div className="search-form-compact">
          
        <div className="search-form-keyword-group">
          <label className="search-form-label">Palabras clave</label>
          <input
            type="text"
            placeholder="Ej: paneles solares, energía, colegio (separa con comas)"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            className="search-form-keyword-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Fecha Publicacion De</label>
          <input
            type="date"
            value={fechaPubDesde}
            onChange={(e) => setFechaPubDesde(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Fecha Publicacion Hasta</label>
          <input
            type="date"
            value={fechaPubHasta}
            onChange={(e) => setFechaPubHasta(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Manifestacion de Interes De</label>
          <input
            type="date"
            value={fechaManifDesde}
            onChange={(e) => setFechaManifDesde(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Manifestacion de Interes Hasta</label>
          <input
            type="date"
            value={fechaManifHasta}
            onChange={(e) => setFechaManifHasta(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Presentacion de Ofertas De (Opcional)</label>
          <input
            type="date"
            value={fechaRecDesde}
            onChange={(e) => setFechaRecDesde(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Presentacion de Ofertas Hasta</label>
          <input
            type="date"
            value={fechaRecHasta}
            onChange={(e) => setFechaRecHasta(e.target.value)}
            className="search-form-date-input"
          />
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Fase</label>
          <select
            value={fase}
            onChange={(e) => setFase(e.target.value)}
            className="search-form-select"
          >
            <option value="">Todas las Fases</option>
            <option value="Presentación de Ofertas">Presentación de Ofertas</option>
          </select>
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="search-form-select"
          >
            <option value="">Todos los Estados</option>
            <option value="Abierto">Abierto</option>
          </select>
        </div>

        <div className="search-form-button-group">
          <button
            type="submit"
            className="search-form-button-primary"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="search-form-button-secondary"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="search-form-location-row">
        <select
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="search-form-select"
        >
          <option value="">Ubicacion - Departamento</option>
          {DEPARTAMENTOS_COLOMBIA.map((d, i) => (
            <option key={i} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          className="search-form-select"
          disabled={!departamento}
        >
          <option value="">Ciudad</option>
          {ciudadesFiltradas.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
