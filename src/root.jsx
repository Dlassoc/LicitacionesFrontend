// src/root.jsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

import RootLayout from "./layout/RootLayout.jsx";

const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const App = lazy(() => import("./app/App.jsx"));
const PreferencesPage = lazy(() => import("./pages/PreferencesPage.jsx"));
const SavedLicitacionesPage = lazy(() => import("./pages/SavedLicitacionesPage.jsx"));

function RouteFallback() {
  return <SplashScreen text="Cargando vista..." />;
}

function SuspendedPage({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function Root() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <SuspendedPage>
            <Login />
          </SuspendedPage>
        }
      />
      <Route
        path="/register"
        element={
          <SuspendedPage>
            <Register />
          </SuspendedPage>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <SuspendedPage>
              <App />
            </SuspendedPage>
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/preferences"
        element={
          <ProtectedRoute>
            <RootLayout>
              <SuspendedPage>
                <PreferencesPage />
              </SuspendedPage>
            </RootLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/saved"
        element={
          <ProtectedRoute>
            <RootLayout>
              <SuspendedPage>
                <SavedLicitacionesPage />
              </SuspendedPage>
            </RootLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
