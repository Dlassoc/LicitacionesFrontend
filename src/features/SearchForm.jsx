import React, { useState, useEffect } from "react";
import { getFinalDateRange } from "../utils/dateHelpers.js";
import "../styles/features/search-form.css";

// listas como en tu versión
const DEPARTAMENTOS_COLOMBIA = [
  "Amazonas","Antioquia","Arauca","Atlántico","Bolívar",
  "Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar",
  "Chocó","Córdoba","Cundinamarca","Guainía","Guaviare",
  "Huila","La Guajira","Magdalena","Meta","Nariño",
  "Norte de Santander","Putumayo","Quindío","Risaralda",
  "San Andrés y Providencia","Santander","Sucre","Tolima",
  "Valle del Cauca","Vaupés","Vichada"
];

const CIUDADES_COLOMBIA = {
  Amazonas:["Leticia","Puerto Nariño"],
  Antioquia:["Medellín","Envigado","Bello","Itagüí","Apartadó","Rionegro","Turbo"],
  Arauca:["Arauca","Tame","Saravena"],
  Atlántico:["Barranquilla","Soledad","Malambo","Puerto Colombia"],
  Bolívar:["Cartagena de Indias","Magangué","Carmen de Bolívar","Arjona"],
  Boyacá:["Tunja","Duitama","Sogamoso","Chiquinquirá"],
  Caldas:["Manizales","La Dorada","Villamaría","Chinchiná"],
  Caquetá:["Florencia","San Vicente del Caguán","Belén de los Andaquíes"],
  Casanare:["Yopal","Aguazul","Villanueva"],
  Cauca:["Popayán","Puerto Tejada","Santander de Quilichao","Miranda"],
  Cesar:["Valledupar","Aguachica","Bosconia"],
  Chocó:["Quibdó","Istmina","Bahía Solano"],
  Córdoba:["Montería","Lorica","Cereté","Sahagún"],
  Cundinamarca:["Bogotá","Soacha","Chía","Fusagasugá","Zipaquirá"],
  Guainía:["Inírida"],
  Guaviare:["San José del Guaviare","Calamar"],
  Huila:["Neiva","Pitalito","Garzón"],
  "La Guajira":["Riohacha","Maicao","Uribia"],
  Magdalena:["Santa Marta","Ciénaga","Fundación"],
  Meta:["Villavicencio","Acacías","Granada"],
  Nariño:["Pasto","Tumaco","Ipiales"],
  "Norte de Santander":["Cúcuta","Ocaña","Pamplona","Villa del Rosario"],
  Putumayo:["Mocoa","Puerto Asís"],
  Quindío:["Armenia","Calarcá","Montenegro"],
  Risaralda:["Pereira","Dosquebradas","Santa Rosa de Cabal"],
  "San Andrés y Providencia":["San Andrés","Providencia"],
  Santander:["Bucaramanga","Floridablanca","Barrancabermeja","San Gil"],
  Sucre:["Sincelejo","Sampués","Corozal"],
  Tolima:["Ibagué","Espinal","Melgar"],
  "Valle del Cauca":["Cali","Palmira","Buenaventura","Tuluá"],
  Vaupés:["Mitú"],
  Vichada:["Puerto Carreño"]
};

// Claves para localStorage
const FORM_STORAGE_KEY = 'secop_search_form';

export default function SearchForm({ onBuscar, onClear }) {
  // Cargar valores guardados del formulario
  const loadFormData = () => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const savedData = loadFormData();

  const [termino, setTermino] = useState(savedData.termino || "");
  const [fechaPubDesde, setFechaPubDesde] = useState(savedData.fechaPubDesde || "");
  const [fechaPubHasta, setFechaPubHasta] = useState(savedData.fechaPubHasta || "");
  const [fechaManifDesde, setFechaManifDesde] = useState(savedData.fechaManifDesde || "");
  const [fechaManifHasta, setFechaManifHasta] = useState(savedData.fechaManifHasta || "");
  const [fechaRecDesde, setFechaRecDesde] = useState(savedData.fechaRecDesde || "");
  const [fechaRecHasta, setFechaRecHasta] = useState(savedData.fechaRecHasta || "");
  const [departamento, setDepartamento] = useState(savedData.departamento || "");
  const [ciudad, setCiudad] = useState(savedData.ciudad || "");
  const [ciudadesFiltradas, setCiudadesFiltradas] = useState([]);
  const [fase, setFase] = useState(savedData.fase || "Presentación de Ofertas");
  const [estado, setEstado] = useState(savedData.estado || "Abierto");

  // Guardar formulario en localStorage cuando cambien los valores
  useEffect(() => {
    try {
      const formData = {
        termino,
        fechaPubDesde,
        fechaPubHasta,
        fechaManifDesde,
        fechaManifHasta,
        fechaRecDesde,
        fechaRecHasta,
        departamento,
        ciudad,
        fase,
        estado
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn('Error guardando formulario:', e);
    }
  }, [termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, fechaRecDesde, fechaRecHasta, departamento, ciudad, fase, estado]);

  useEffect(() => {
    if (departamento && CIUDADES_COLOMBIA[departamento]) {
      setCiudadesFiltradas(CIUDADES_COLOMBIA[departamento]);
      // Solo limpiar ciudad si el departamento cambió y la ciudad actual no está en la nueva lista
      if (ciudad && !CIUDADES_COLOMBIA[departamento].includes(ciudad)) {
        setCiudad("");
      }
    } else {
      setCiudadesFiltradas([]);
      if (departamento === "") {
        setCiudad("");
      }
    }
  }, [departamento]);

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
    setTermino("");
    setFechaPubDesde("");
    setFechaPubHasta("");
    setFechaManifDesde("");
    setFechaManifHasta("");
    setFechaRecDesde("");
    setFechaRecHasta("");
    setDepartamento("");
    setCiudad("");
    setCiudadesFiltradas([]);
    setFase("Presentación de Ofertas");
    setEstado("Abierto");
    
    // Limpiar también del localStorage
    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
    } catch (e) {
      console.warn('Error limpiando formulario:', e);
    }
    
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
            <option value="Presentación de Ofertas">Presentación de Ofertas</option>
            <option value="">Todas las Fases</option>
          </select>
        </div>

        <div className="search-form-date-group">
          <label className="search-form-label">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="search-form-select"
          >
            <option value="Abierto">Abierto</option>
            <option value="">Todos los Estados</option>
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
