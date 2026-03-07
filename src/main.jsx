// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ThemeProvider from "./components/ThemeProvider.jsx";
import AuthProvider from "./auth/AuthContext.jsx";
import Root from "./root.jsx";
import "./styles/global/darkmode-colors.css";
import "./styles/global/theme.css";
import "./index.css";
import API_BASE_URL from "./config/api";

// Log de arranque para verificar que el build usa la URL correcta de backend
console.log("[FRONTEND INIT] API_BASE_URL =", API_BASE_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);