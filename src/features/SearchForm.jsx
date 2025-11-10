import React, { useState, useEffect } from "react";
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

export default function SearchForm({ onBuscar, onClear }) {
  const [termino, setTermino] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ciudadesFiltradas, setCiudadesFiltradas] = useState([]);

  useEffect(() => {
    if (departamento && CIUDADES_COLOMBIA[departamento]) {
      setCiudadesFiltradas(CIUDADES_COLOMBIA[departamento]);
      setCiudad("");
    } else {
      setCiudadesFiltradas([]);
      setCiudad("");
    }
  }, [departamento]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onBuscar(termino, fechaInicio, fechaFin, ciudad, departamento);
  };

  const handleClear = () => {
    setTermino("");
    setFechaInicio("");
    setFechaFin("");
    setDepartamento("");
    setCiudad("");
    setCiudadesFiltradas([]);
    onClear?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="search-form-wrapper"
    >
      <input
        type="text"
        placeholder="Palabras clave"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        className="search-form-input"
      />
      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        className="search-form-date-input"
        aria-label="Fecha inicio"
      />
      <input
        type="date"
        value={fechaFin}
        onChange={(e) => setFechaFin(e.target.value)}
        className="search-form-date-input"
        aria-label="Fecha fin"
      />
      <select
        value={departamento}
        onChange={(e) => setDepartamento(e.target.value)}
        className="search-form-select"
        aria-label="Departamento"
      >
        <option value="">Departamento</option>
        {DEPARTAMENTOS_COLOMBIA.map((d, i) => (
          <option key={i} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={ciudad}
        onChange={(e) => setCiudad(e.target.value)}
        className="search-form-select"
        aria-label="Ciudad"
        disabled={!departamento}
      >
        <option value="">Ciudad</option>
        {ciudadesFiltradas.map((c, i) => (
          <option key={i} value={c}>{c}</option>
        ))}
      </select>

      <div className="search-form-button-group">
        <button
          type="submit"
          className="search-form-button-primary"
          aria-label="Buscar"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="search-form-button-secondary"
          aria-label="Limpiar"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
