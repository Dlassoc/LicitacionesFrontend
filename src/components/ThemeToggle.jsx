import React from "react";
import { useTheme } from "./ThemeProvider.jsx";
import { FaMoon, FaSun } from "react-icons/fa";
import "../styles/global/theme.css";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle"
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={isDark ? "Tema claro" : "Tema oscuro"}
    >
      {isDark ? <FaSun /> : <FaMoon />}
    </button>
  );
}
