import React from "react";
import Preferences from "./Preferences.jsx";
import "../styles/pages/preferences-page.css";

export default function PreferencesPage() {
  return (
    <div className="preferences-page-container">
      <main className="preferences-page-main">
        <Preferences unlocked={true} />
      </main>

      <footer className="preferences-page-footer">
        © {new Date().getFullYear()} Emergente Energía Sostenible
      </footer>
    </div>
  );
}
