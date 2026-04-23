import React from "react";
import { Outlet } from "react-router-dom";

function NavigationGuard() {
  // Placeholder guard: plug auth logic here later.
  return <Outlet />;
}

export default NavigationGuard;
