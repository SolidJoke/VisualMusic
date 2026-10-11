// VMU-188 — which page the app shows. This module is the ONE owner of that
// choice: AppDesktop reads IS_PROTOTYPE_A from here, and nothing else reads the
// `layout` or `prototype` URL parameters (PageChoice.test.jsx enforces it).
//
// The choice is read once, when this module loads (no live switch on resize):
//
//   ?layout=classic             -> the classic page (escape hatch and comparison;
//                                  not linked from the interface)
//   ?prototype=a                -> A′ (alias kept: bookmarks, the S1 probe, A′ tests)
//   no parameter, >= 2560 px    -> A′
//   no parameter, <  2560 px    -> the classic page (tablet and phone unchanged)
//
// ?layout=classic wins over ?prototype=a when both are present.
// The 2560 px test is the same query as the desktop branch of useBreakpoint.

export const DESKTOP_QUERY = "(min-width: 2560px)";

export function choosePage(search, isDesktop) {
  const params = new URLSearchParams(search);
  if (params.get("layout") === "classic") return "classic";
  if (params.get("prototype") === "a") return "a";
  return isDesktop ? "a" : "classic";
}

function isDesktopViewport() {
  // Without matchMedia (SSR) useBreakpoint answers "desktop": answer the same.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export const PAGE = choosePage(
  typeof window === "undefined" ? "" : window.location.search,
  isDesktopViewport()
);

export const IS_PROTOTYPE_A = PAGE === "a";
