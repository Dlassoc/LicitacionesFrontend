import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext.jsx";

export default function AdminRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user?.is_superadmin) return <Navigate to="/app" replace />;

  return children;
}
