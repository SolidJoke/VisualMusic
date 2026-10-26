// L1b-1c — the classic page's PositionSelector now decides through the shared
// positionPanel.js. Its markup is unchanged (the other suites, InstrumentView
// and PlacementsBehaviour, pin it); what changes is the "out of range" alert,
// which read `fingering.outOfRange` — a field the engine never produces
// (fingeringLogic.js analyzeVoicing and useMusicEngine.js hand out
// `isOutOfRange`) — so it never showed. Here it shows.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AppProvider } from "../../../context/AppContext";
import { translations } from "../../../i18n/translations";
import PositionSelector from "../PositionSelector";

afterEach(cleanup);

const fr = translations.fr;

function mount(instrumentType, fingering) {
  return render(
    <AppProvider>
      <PositionSelector
        instrumentType={instrumentType}
        selectedRootString={null}
        setSelectedRootString={vi.fn()}
        fingering={fingering}
        placements={[]}
        placementIndex={null}
        setPlacementIndex={vi.fn()}
        isScaleMode={false}
        rootVal={0}
        scaleAnchor={null}
        setScaleAnchor={vi.fn()}
      />
    </AppProvider>
  );
}

describe("L1b-1c — PositionSelector's alerts read the field the engine produces", () => {
  it("guitar, fingering.isOutOfRange: the out-of-range alert shows (it never did)", () => {
    const { container } = mount("guitar", { isOutOfRange: true, difficultStretch: false });
    expect(container.textContent).toContain(fr.warningOutOfRange);
  });

  it("guitar, fingering.outOfRange (a field nobody produces): no alert", () => {
    const { container } = mount("guitar", { outOfRange: true });
    expect(container.textContent).not.toContain(fr.warningOutOfRange);
  });

  it("guitar, difficultStretch alone: the stretch alert, not the other", () => {
    const { container } = mount("guitar", { isOutOfRange: false, difficultStretch: true });
    expect(container.textContent).toContain(fr.warningDifficultStretch);
    expect(container.textContent).not.toContain(fr.warningOutOfRange);
  });

  it("the bass shows neither, as before", () => {
    const { container } = mount("bass", { isOutOfRange: true, difficultStretch: true });
    expect(container.textContent).not.toContain(fr.warningOutOfRange);
    expect(container.textContent).not.toContain(fr.warningDifficultStretch);
  });

  it("the three root-string buttons and the barre legend are still there, in the classic words", () => {
    const { container } = mount("guitar", null);
    const text = container.textContent;
    expect(text).toContain("Mi (fr.8)");
    expect(text).toContain("La (fr.3)");
    expect(text).toContain("Ré (fr.10)");
    expect(text).toContain(fr.barreLegend.trim());
  });
});
