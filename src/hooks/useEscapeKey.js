import { useEffect } from "react";

/**
 * Escape closes a window while it is open — the way Modal.jsx and
 * HelpModal.jsx already close theirs.
 *
 * The "Guide & Théorie" and "À propos" windows closed by their ✖ button only:
 * the parity audit of 2026-10-05 observed it (§ 2.3, "Échap ferme le Guide,
 * mais pas Théorie ni À propos") and A′-ACCÈS asks every window to close on
 * Escape. Listened to on `document`, in the bubble phase, like Modal.jsx — so
 * an open CustomSelect list (which stops Escape in the capture phase) still
 * closes first, alone.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
export function useEscapeKey(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

export default useEscapeKey;
