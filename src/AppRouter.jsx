import React, { lazy, Suspense } from "react";
import useBreakpoint, { BREAKPOINTS } from "./hooks/useBreakpoint";

// Lazy load layout components
const AppDesktop = lazy(() => import("./AppDesktop"));
const AppTablet = lazy(() => import("./AppTablet"));
const AppMobile = lazy(() => import("./AppMobile"));

// Fallback loader while bundle is resolved
const LoadingFallback = () => (
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    height: "100vh", 
    background: "#0e0f17", 
    color: "#888", 
    fontFamily: "Inter, sans-serif"
  }}>
    Loading VisualMusic...
  </div>
);

/**
 * AppRouter — Responsive layout switcher routing between Desktop, Tablet and Mobile
 */
export default function AppRouter() {
  const { breakpoint } = useBreakpoint();

  return (
    <Suspense fallback={<LoadingFallback />}>
      {breakpoint === BREAKPOINTS.DESKTOP && <AppDesktop />}
      {breakpoint === BREAKPOINTS.TABLET && <AppTablet />}
      {breakpoint === BREAKPOINTS.PHONE && <AppMobile />}
    </Suspense>
  );
}
