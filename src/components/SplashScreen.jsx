// src/components/SplashScreen.jsx
import React from "react";
import logo from "../assets/logo_emergente.png";
import "../styles/splash.css";

export default function SplashScreen({ text = "Ingresando…" }) {
  return (
    <div className="splash">
      <div className="splash-card">
        <img src={logo} alt="Emergente" className="splash-logo" />
        <div className="splash-spinner" aria-label="Cargando" />
        <p className="splash-text">{text}</p>
      </div>
    </div>
  );
}
