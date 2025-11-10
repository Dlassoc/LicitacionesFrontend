// src/layouts/RootLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import "../styles/global/header.css"; // importa tus estilos del header

export default function RootLayout() {
  return (
    <div className="min-h-screen main-bg">
      {/* Header sticky y visible en TODAS las rutas */}
      <Header />
      {/* Contenido de cada página */}
      <Outlet />
    </div>
  );
}
