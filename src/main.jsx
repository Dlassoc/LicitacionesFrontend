// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ThemeProvider from "./components/ThemeProvider.jsx";
import AuthProvider from "./auth/AuthContext.jsx";
import Root from "./root.jsx";              // <-- usa Root como router
import "./styles/theme.css";                // <-- (si usas el tema manual)
import "./index.css";                       // <-- tu global (si aplica)
import "./styles/theme.css";

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
