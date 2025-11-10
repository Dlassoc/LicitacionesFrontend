// src/root.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import App from "./app/App.jsx";

// IMPORTA las páginas que ya incluyen el Header:
import PreferencesPage from "./pages/PreferencesPage.jsx";

export default function Root() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <App /> {/* Aquí tu App con Header propio */}
          </ProtectedRoute>
        }
      />

      {/* /app/preferences usando la página que SÍ pinta el Header */}
      <Route
        path="/app/preferences"
        element={
          <ProtectedRoute>
            <PreferencesPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
