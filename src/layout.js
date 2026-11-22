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
//   no parameter, <= 767 px     -> A′ in its PHONE variant (C-109: one
//                                  instrument on the stage, the centre in a
//                                  bottom drawer); PHONE_MAX_WIDTH / IS_PHONE
//                                  tell PrototypeA to wear .proto-a--phone
//   no parameter, 768..1647 px  -> the classic page (tablet, a later lot)
//
// ?layout=classic wins over ?prototype=a when both are present. Below 768 px
// the choice does not stop at A′: IS_PHONE is what turns on the phone layout,
// and it is read once with PAGE (no live switch on resize, like the page).
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

/** C-109: the last phone width. Below 768 px A′ wears its phone layout. */
export const PHONE_MAX_WIDTH = 767;

/** The phone's query — the same 767 px useBreakpoint calls PHONE. */
export const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;

export function choosePage(search, isWide, isPhone = false) {
  const params = new URLSearchParams(search);
  if (params.get("layout") === "classic") return "classic";
  if (params.get("prototype") === "a") return "a";
  // C-109: below 768 px A′ is served too (its phone variant); 768..1647 stays
  // the classic page — a later lot.
  if (isPhone) return "a";
  return isWide ? "a" : "classic";
}

function isWideViewport() {
  // Without matchMedia (SSR) useBreakpoint answers "desktop": answer the same.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia(A_PRIME_QUERY).matches;
}

function isPhoneViewport() {
  // SSR has no window: no phone variant.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(PHONE_QUERY).matches;
}

/** C-109 — the viewport is a phone (<= 767 px), read once at load. */
export const IS_PHONE = isPhoneViewport();

export const PAGE = choosePage(
  typeof window === "undefined" ? "" : window.location.search,
  isWideViewport(),
  IS_PHONE
);

export const IS_PROTOTYPE_A = PAGE === "a";
