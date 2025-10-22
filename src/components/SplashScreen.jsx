import React from "react";
import "../styles/splash.css";
import logo from "../assets/logo_emergente.png";

export default function SplashScreen({ text = "Cargando proyectos…" }) {
  return (
    <div className="splash" role="status" aria-live="polite" aria-busy="true">
      <div className="splash-box">
        <img src={logo} alt="Emergente" className="splash-logo" />
        <div className="splash-info">
          <div className="splash-spinner" />
          <div className="splash-text">{text}</div>
        </div>
      </div>
    </div>
  );
}
