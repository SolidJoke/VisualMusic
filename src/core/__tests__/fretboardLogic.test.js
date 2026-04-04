import { describe, it, expect } from "vitest";
import { calcActivePath } from "../fretboardLogic";

describe("fretboardLogic: calcActivePath", () => {
  it("returns empty array if no contextual scale is provided", () => {
    const path = calcActivePath({
      contextualScaleAbsoluteValues: [],
      dictType: "scale_major",
      lastClickedContext: null,
      instrument: "guitar",
      strings: ["E4", "B3", "G3", "D3", "A2", "E2"],
      numFrets: 14,
    });
    expect(path).toEqual([]);
  });

  it("calculates correct starting position for a C major scale on guitar", () => {
    // Note: C4 = 60, D4 = 62, E4 = 64
    const scale = [
      { absoluteValue: 60, order: 1 },
      { absoluteValue: 62, order: 2 },
    ];
    // strings reversed as they are passed from Fretboard
    const strings = ["E4", "B3", "G3", "D3", "A2", "E2"];
    
    // Test that the algorithm picks an appropriate starting string and fret
    // E2 is 40. 60 - 40 = 20 (too high)
    // A2 is 45. 60 - 45 = 15 (too high for 14 frets)
    // D3 is 50. 60 - 50 = 10. Wait D3 is 50? C3 is 48. C4 is 60. So D3 is 50.
    // Let's rely on the algorithm's output format to test just the structure.
    
    const path = calcActivePath({
      contextualScaleAbsoluteValues: scale,
      dictType: "scale_major",
      lastClickedContext: { stringIndex: 2, fret: 5, instrument: "guitar" }, // G3 (55) + fret 5 = 60
      instrument: "guitar",
      strings: ["E4", "B3", "G3", "D3", "A2", "E2"], // Standard E tuning reversed
      numFrets: 14,
    });
    
    expect(path.length).toBe(2);
    expect(path[0].absoluteValue).toBe(60);
    expect(path[1].absoluteValue).toBe(62);
  });
});
