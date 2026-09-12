import React, { lazy, Suspense, useEffect } from "react";
import useBreakpoint, { BREAKPOINTS } from "./hooks/useBreakpoint";
import "./AppRouter.css";

// Lazy load layout components
const AppDesktop = lazy(() => import("./AppDesktop"));
const AppTablet = lazy(() => import("./AppTablet"));
const AppMobile = lazy(() => import("./AppMobile"));

// Fallback loader while bundle is resolved — uses design system tokens via AppRouter.css
const LoadingFallback = () => (
  <div className="app-loading-fallback">
    Loading VisualMusic...
  </div>
);

/**
 * AppRouter — Responsive layout switcher routing between Desktop, Tablet and Mobile
 * Breakpoints:
 *  - phone   : < 768px   → AppMobile (stub, work in progress)
 *  - tablet  : 768-2559px → AppTablet (currently delegates to AppDesktop)
 *  - desktop : >= 2560px  → AppDesktop (full 4K experience)
 */
export default function AppRouter() {
  const { breakpoint } = useBreakpoint();

  // Start fetching and decoding the instrument samples as soon as the app is on
  // screen, rather than on the first click that makes a sound. Loading takes no
  // user gesture, but it does take time, and a click that arrives first gets the
  // PolySynth fallback (VMU-102). Imported dynamically so Tone.js stays out of
  // the entry chunk.
  useEffect(() => {
    let cancelled = false;
    import("./audio/AudioEngine").then((engine) => {
      if (!cancelled) engine.preloadSamplers();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      {breakpoint === BREAKPOINTS.DESKTOP && <AppDesktop />}
      {breakpoint === BREAKPOINTS.TABLET && <AppTablet />}
      {breakpoint === BREAKPOINTS.PHONE && <AppMobile />}
    </Suspense>
  );
}
