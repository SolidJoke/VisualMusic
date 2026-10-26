// L1b-1c — what a neck's position panel decides, shared by the classic page's
// PositionSelector and A′'s position panel (src/components/Instruments/
// positionPanel.js): one copy of the rules, so the two pages cannot disagree.
//
// Domain values (standard tuning, Do = 0, frets counted from the nut): the root
// Do lies at fret 8 on the low E string, 3 on the A string, 10 on the D string;
// Sol (7) at 3 / 10 / 5; Mi (4) is the open low E string (0), fret 7 on the A,
// 2 on the D. The guitar's three root strings are idx 5 / 4 / 3 (E / A / D),
// the bass's idx 3 / 2 / 1 (E / A / D): fingeringLogic.js indexes strings from
// the high one.
import { describe, it, expect } from "vitest";
import { rootStringChoices, positionAlerts, positionResets, positionPanelView } from "../positionPanel";

const summary = (choices) => choices.map((c) => `${c.idx}:${c.label}:${c.fret}`).join(" ");

describe("rootStringChoices — the three strings a root can be put on, and its fret on each", () => {
  it("guitar, Do: E string (idx 5) fret 8, A string (idx 4) fret 3, D string (idx 3) fret 10", () => {
    expect(summary(rootStringChoices({ instrumentType: "guitar", rootVal: 0, notation: "eu" }))).toBe("5:Mi:8 4:La:3 3:Ré:10");
  });

  it("guitar, Sol: 3 / 10 / 5", () => {
    expect(summary(rootStringChoices({ instrumentType: "guitar", rootVal: 7, notation: "eu" }))).toBe("5:Mi:3 4:La:10 3:Ré:5");
  });

  it("guitar, Mi: the open E string is fret 0 (isOpen), then 7 and 2", () => {
    const choices = rootStringChoices({ instrumentType: "guitar", rootVal: 4, notation: "eu" });
    expect(summary(choices)).toBe("5:Mi:0 4:La:7 3:Ré:2");
    expect(choices.map((c) => c.isOpen)).toEqual([true, false, false]);
  });

  it("bass, Do: its own strings (idx 3 / 2 / 1), the same frets", () => {
    expect(summary(rootStringChoices({ instrumentType: "bass", rootVal: 0, notation: "eu" }))).toBe("3:Mi:8 2:La:3 1:Ré:10");
  });

  it("bass, Sol and Mi: idx 3 / 2 / 1 again, never the guitar's 5 / 4 / 3", () => {
    expect(summary(rootStringChoices({ instrumentType: "bass", rootVal: 7, notation: "eu" }))).toBe("3:Mi:3 2:La:10 1:Ré:5");
    expect(rootStringChoices({ instrumentType: "bass", rootVal: 4, notation: "eu" }).map((c) => c.idx)).toEqual([3, 2, 1]);
  });

  it("the letters follow the page's notation: E A D in 'us'", () => {
    expect(rootStringChoices({ instrumentType: "guitar", rootVal: 0, notation: "us" }).map((c) => c.label)).toEqual(["E", "A", "D"]);
  });
});

describe("positionAlerts — which warning a fingering earns (the guitar only)", () => {
  it("isOutOfRange (the field the engine produces) earns the out-of-range alert", () => {
    expect(positionAlerts({ instrumentType: "guitar", fingering: { isOutOfRange: true, difficultStretch: false } })).toEqual({ outOfRange: true, difficultStretch: false });
  });

  it("a field named outOfRange, which the engine never produces, earns nothing (the classic page read that one)", () => {
    expect(positionAlerts({ instrumentType: "guitar", fingering: { outOfRange: true } })).toEqual({ outOfRange: false, difficultStretch: false });
  });

  it("difficultStretch alone earns the stretch alert", () => {
    expect(positionAlerts({ instrumentType: "guitar", fingering: { isOutOfRange: false, difficultStretch: true } })).toEqual({ outOfRange: false, difficultStretch: true });
  });

  it("both: only the out-of-range one (it is the graver)", () => {
    expect(positionAlerts({ instrumentType: "guitar", fingering: { isOutOfRange: true, difficultStretch: true } })).toEqual({ outOfRange: true, difficultStretch: false });
  });

  it("the bass has no alert, whatever its fingering says; nor does a missing fingering", () => {
    expect(positionAlerts({ instrumentType: "bass", fingering: { isOutOfRange: true, difficultStretch: true } })).toEqual({ outOfRange: false, difficultStretch: false });
    expect(positionAlerts({ instrumentType: "guitar", fingering: null })).toEqual({ outOfRange: false, difficultStretch: false });
  });
});

describe("positionResets — when each reset is offered", () => {
  it("'Réinitialiser le focus': a scale with an anchor, only", () => {
    expect(positionResets({ isScaleMode: true, scaleAnchor: { string: 2, fret: 5 }, placementIndex: null }).focus).toBe(true);
    expect(positionResets({ isScaleMode: true, scaleAnchor: null, placementIndex: null }).focus).toBe(false);
    expect(positionResets({ isScaleMode: false, scaleAnchor: { string: 2, fret: 5 }, placementIndex: null }).focus).toBe(false);
  });

  it("'Réinitialiser Position': as soon as an index is chosen, 0 included", () => {
    expect(positionResets({ isScaleMode: false, scaleAnchor: null, placementIndex: null }).position).toBe(false);
    expect(positionResets({ isScaleMode: false, scaleAnchor: null, placementIndex: 0 }).position).toBe(true);
    expect(positionResets({ isScaleMode: true, scaleAnchor: null, placementIndex: 3 }).position).toBe(true);
  });
});

describe("positionPanelView — what the panel holds, and whether it is worth opening", () => {
  const base = { instrumentType: "guitar", rootVal: 0, notation: "eu", isScaleMode: false, scaleAnchor: null, placementIndex: null, fingering: null, range: "Do3 – Mi4" };

  it("a chord on the guitar: the three strings, the barre legend, the range, no reset, no alert", () => {
    const v = positionPanelView(base);
    expect(summary(v.rootStrings)).toBe("5:Mi:8 4:La:3 3:Ré:10");
    expect(v.barre).toBe(true);
    expect(v.range).toBe("Do3 – Mi4");
    expect(v.resets).toEqual({ focus: false, position: false });
    expect(v.alert).toBeNull();
    expect(v.hasContent).toBe(true);
  });

  it("a scale: no 'Fondamentale sur' (a scale has no root string to choose)", () => {
    expect(positionPanelView({ ...base, isScaleMode: true }).rootStrings).toBeNull();
  });

  it("the bass has no barre legend", () => {
    expect(positionPanelView({ ...base, instrumentType: "bass" }).barre).toBe(false);
  });

  it("alert names the graver warning, null when none", () => {
    expect(positionPanelView({ ...base, fingering: { isOutOfRange: true } }).alert).toBe("outOfRange");
    expect(positionPanelView({ ...base, fingering: { difficultStretch: true } }).alert).toBe("difficultStretch");
  });

  it("nothing to show -> not worth opening: a bass scale with no anchor, no index and no range", () => {
    const v = positionPanelView({ ...base, instrumentType: "bass", isScaleMode: true, range: "" });
    expect(v.hasContent).toBe(false);
  });

  it("the same bass scale with a range, or with an index to reset, is worth opening", () => {
    expect(positionPanelView({ ...base, instrumentType: "bass", isScaleMode: true, range: "Do2 – Do4" }).hasContent).toBe(true);
    expect(positionPanelView({ ...base, instrumentType: "bass", isScaleMode: true, range: "", placementIndex: 1 }).hasContent).toBe(true);
  });
});
