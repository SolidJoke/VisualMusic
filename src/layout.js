// VMU-188 / C-104 — which page the app shows. This module is the ONE owner of
// that choice: AppDesktop reads IS_PROTOTYPE_A from here, and nothing else reads
// the `layout` or `prototype` URL parameters (PageChoice.test.jsx enforces it).
//
// The choice is read once, when this module loads (no live switch on resize):
//
//   ?layout=classic             -> the classic page (escape hatch and comparison;
//                                  not linked from the interface)
//   ?prototype=a                -> A′ (alias kept: bookmarks, the S1 probe, A′ tests)
//   no parameter, >= 1648 px    -> A′ (C-104: 1648..2559 shows ONE instrument
//                                  column, 2560 and wider all three)
//   no parameter, <  1648 px    -> the classic page (tablet and phone unchanged)
//
// ?layout=classic wins over ?prototype=a when both are present.
//
// C-104 (Step 3b): A_PRIME_MIN_WIDTH is the page's threshold, ONE named constant
// the probe may move later. C-107 (Step 3b, part 4) moved it from 1600 to 1648:
// at 1600 the guitar's position rail left the sequencer's step cells 45.9px
// wide, under S1-11's 48px minimum; 1648 is the first multiple of 16 where the
// rule holds (~48.9px). DESKTOP_QUERY keeps its meaning — "three instrument
// columns" — and is read live by PrototypeA.jsx (it follows a resize); it is no
// longer the page's threshold. A_PRIME_QUERY is the page's, here only.

/** The width from which A′ is served (C-104; moved to 1648 by C-107). */
export const A_PRIME_MIN_WIDTH = 1648;

/** The page's query: A′ from A_PRIME_MIN_WIDTH. */
export const A_PRIME_QUERY = `(min-width: ${A_PRIME_MIN_WIDTH}px)`;

/** Three instrument columns in A′ (PrototypeA.jsx reads it live). */
export const DESKTOP_QUERY = "(min-width: 2560px)";

export function choosePage(search, isWide) {
  const params = new URLSearchParams(search);
  if (params.get("layout") === "classic") return "classic";
  if (params.get("prototype") === "a") return "a";
  return isWide ? "a" : "classic";
}

function isWideViewport() {
  // Without matchMedia (SSR) useBreakpoint answers "desktop": answer the same.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia(A_PRIME_QUERY).matches;
}

export const PAGE = choosePage(
  typeof window === "undefined" ? "" : window.location.search,
  isWideViewport()
);

export const IS_PROTOTYPE_A = PAGE === "a";
