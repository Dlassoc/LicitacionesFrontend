import { useEffect, useState } from "react";
import { CIUDADES_COLOMBIA, FORM_STORAGE_KEY } from "./locationData.js";

function loadFormData() {
  try {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (parsed && !parsed._defaultsMigratedV2) {
      const todayStr = new Date().toISOString().split("T")[0];
      const yearStart = `${new Date().getFullYear()}-01-01`;

      const migrated = {
        ...parsed,
        _defaultsMigratedV2: true,
      };

      if (migrated.fase === "Presentación de Ofertas") migrated.fase = "";
      if (migrated.estado === "Abierto") migrated.estado = "";
      if (migrated.fechaRecDesde === yearStart && migrated.fechaRecHasta === todayStr) {
        migrated.fechaRecDesde = "";
        migrated.fechaRecHasta = "";
      }

      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return parsed;
  } catch {
    return {};
  }
}

export function useSearchFormState() {
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
  const [fase, setFase] = useState(savedData.fase || "");
  const [estado, setEstado] = useState(savedData.estado || "");

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
        estado,
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn("Error guardando formulario:", e);
    }
  }, [termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, fechaRecDesde, fechaRecHasta, departamento, ciudad, fase, estado]);

  useEffect(() => {
    if (departamento && CIUDADES_COLOMBIA[departamento]) {
      setCiudadesFiltradas(CIUDADES_COLOMBIA[departamento]);
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

  const clearForm = () => {
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
    setFase("");
    setEstado("");

    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
    } catch (e) {
      console.warn("Error limpiando formulario:", e);
    }
  };

  return {
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
  };
}
