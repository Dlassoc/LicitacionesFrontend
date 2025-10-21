import React, { useState, useEffect } from "react";

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
      className="flex flex-col md:flex-row md:flex-wrap gap-2 items-stretch bg-white p-5 rounded shadow"
    >
      <input
        type="text"
        placeholder="Palabras clave"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        className="border p-2 rounded w-full md:w-40"
      />
      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        className="border p-2 rounded md:w-40"
        aria-label="Fecha inicio"
      />
      <input
        type="date"
        value={fechaFin}
        onChange={(e) => setFechaFin(e.target.value)}
        className="border p-2 rounded md:w-40"
        aria-label="Fecha fin"
      />
      <select
        value={departamento}
        onChange={(e) => setDepartamento(e.target.value)}
        className="border p-2 rounded md:w-40"
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
        className="border p-2 rounded md:w-40"
        aria-label="Ciudad"
        disabled={!departamento}
      >
        <option value="">Ciudad</option>
        {ciudadesFiltradas.map((c, i) => (
          <option key={i} value={c}>{c}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 "
          aria-label="Buscar"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded border hover:bg-gray-200 "
          aria-label="Limpiar"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
