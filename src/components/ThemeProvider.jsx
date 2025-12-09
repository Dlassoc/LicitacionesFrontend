import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext({ theme: "light", setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    // Devuelve "light" por defecto, solo "dark" si está explícitamente guardado
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    // aplicamos el tema en el <html> para que afecte toda la app
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
