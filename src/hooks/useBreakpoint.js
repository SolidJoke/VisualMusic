import { useState, useEffect } from "react";

export const BREAKPOINTS = {
  PHONE: "phone",
  TABLET: "tablet",
  DESKTOP: "desktop",
};

/**
 * Hook to dynamically track and resolve screen layout breakpoints.
 * Responsive limits:
 * - Phone: < 768px
 * - Tablet: 768px to 2559px
 * - Desktop: >= 2560px (Optimized 4K experience)
 * 
 * @returns {Object} { breakpoint: 'phone' | 'tablet' | 'desktop' }
 */
export default function useBreakpoint() {
  // SSR Safety check
  const isSSR = typeof window === "undefined" || !window.matchMedia;

  const [breakpoint, setBreakpoint] = useState(() => {
    if (isSSR) return BREAKPOINTS.DESKTOP;

    // Direct initial detection
    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    const isTablet = window.matchMedia("(min-width: 768px) and (max-width: 2559px)").matches;
    
    if (isPhone) return BREAKPOINTS.PHONE;
    if (isTablet) return BREAKPOINTS.TABLET;
    return BREAKPOINTS.DESKTOP;
  });

  useEffect(() => {
    if (isSSR) return;

    const mediaPhone = window.matchMedia("(max-width: 767px)");
    const mediaTablet = window.matchMedia("(min-width: 768px) and (max-width: 2559px)");
    const mediaDesktop = window.matchMedia("(min-width: 2560px)");

    const handlePhoneChange = (e) => {
      if (e.matches) setBreakpoint(BREAKPOINTS.PHONE);
    };

    const handleTabletChange = (e) => {
      if (e.matches) setBreakpoint(BREAKPOINTS.TABLET);
    };

    const handleDesktopChange = (e) => {
      if (e.matches) setBreakpoint(BREAKPOINTS.DESKTOP);
    };

    // Modern matchMedia listener interface
    mediaPhone.addEventListener("change", handlePhoneChange);
    mediaTablet.addEventListener("change", handleTabletChange);
    mediaDesktop.addEventListener("change", handleDesktopChange);

    // Cleanup listeners
    return () => {
      mediaPhone.removeEventListener("change", handlePhoneChange);
      mediaTablet.removeEventListener("change", handleTabletChange);
      mediaDesktop.removeEventListener("change", handleDesktopChange);
    };
  }, [isSSR]);

  return { breakpoint };
}
