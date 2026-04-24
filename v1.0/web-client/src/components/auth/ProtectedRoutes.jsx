import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "./AuthWrapper.jsx";
import { Navigate } from "react-router-dom";

function ProtectedRoutes() {
  // Placeholder guard: plug auth logic here later.
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" />;
}

export default ProtectedRoutes;
