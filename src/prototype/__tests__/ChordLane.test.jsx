// VMU-127 (lot 1) — the chord row at the head of the timeline: one box per
// chord, its width its duration; a touch opens the choice (the key's 7 chords,
// insert after, remove, 1 / ½ measure, the suggestions placed after in one
// touch); the length 1 / 2 / 4 / 8; the chord that plays is the one chordAt
// says. Driven by the real editing rule (progressionEdit.js) in a harness that
// holds the list as useStudioMode does.
import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChordLane from "../ChordLane";
import { translations } from "../../i18n/translations";
import { buildStudioTimeline } from "../../core/timeline";
import { applyEditedChords, progressionFromDoc } from "../../core/progressionEdit";
import { generateChordsFromNNS } from "../../core/theory";
import { BRICKS } from "../../core/bricks";

const LANGS = ["fr", "en", "pt", "zh"];
const STYLE = BRICKS[0];
const nameOf = (nns) => generateChordsFromNNS(STYLE.rootValue, STYLE.scaleKey, [nns])[0].chordNameEU;

function Harness({ initial = null, lang = "fr", currentStep = -1, isPlaying = false, onHear = vi.fn(), measuresPerLine = 4 }) {
  const base = buildStudioTimeline({ brickIndex: 0 });
  const [list, setList] = useState(initial);
  const timeline = list ? applyEditedChords(base, list) : base;
  const editChords = (operation) => {
    const start = list ?? progressionFromDoc(timeline);
    const next = operation(start);
    if (next !== start) setList(next);
  };
  return (
    <>
      <ChordLane
        T={translations[lang].protoA}
        timeline={timeline}
        currentStep={currentStep}
        isPlaying={isPlaying}
        editedChords={list}
        editChords={editChords}
        notation="eu"
        onHear={onHear}
        measuresPerLine={measuresPerLine}
      />
      <output data-testid="list">{JSON.stringify(list)}</output>
    </>
  );
}

const lane = () => document.querySelector('[data-fn="composer.progression"]');
const pieces = () => [...lane().querySelectorAll("[data-chord-index]")];
const listNow = () => JSON.parse(screen.getByTestId("list").textContent);
const THREE = [
  { nns: "1", durationSteps: 16 },
  { nns: "4", durationSteps: 16 },
  { nns: "5", durationSteps: 8 },
];

describe("VMU-127: the chord row", () => {
  it("draws what plays: one box per chord of the window, its width its duration", () => {
    render(<Harness initial={THREE} />);
    const boxes = pieces();
    // 1 · 4 · 5½ then the repeats 1 · 4½ that fill the 4-measure window.
    expect(boxes.map((b) => b.getAttribute("data-chord-name"))).toEqual([nameOf("1"), nameOf("4"), nameOf("5"), nameOf("1"), nameOf("4")]);
    expect(boxes.map((b) => b.style.gridColumn)).toEqual(["1 / span 2", "3 / span 2", "5 / span 1", "6 / span 2", "8 / span 1"]);
  });

  it("the repeats are drawn, dashed, and are not buttons", () => {
    render(<Harness initial={THREE} />);
    const boxes = pieces();
    expect(boxes.slice(0, 3).every((b) => b.tagName === "BUTTON")).toBe(true);
    expect(boxes.slice(3).every((b) => b.tagName === "DIV" && b.classList.contains("is-repeat"))).toBe(true);
    // Why there are repeats is one touch away: the ↻ opens the help, which says it.
    const note = screen.getByTestId("chord-loop-note");
    expect(note.getAttribute("aria-label")).toContain("4");
    fireEvent.click(note);
    expect(document.querySelector(".proto-a__chords-help").textContent).toContain(note.getAttribute("aria-label"));
  });

  it("one line: an 8-measure loop is two pages of 4 measures (4 pages of 2 on a phone); playback shows its page", () => {
    const eight = [...THREE, { nns: "6-", durationSteps: 8 }, { nns: "1", durationSteps: 16 }, { nns: "4", durationSteps: 16 }, { nns: "5", durationSteps: 16 }, { nns: "1", durationSteps: 16 }, { nns: "1", durationSteps: 16 }];
    render(<Harness initial={eight} />);
    const pages = () => [...screen.getByTestId("chord-pages").querySelectorAll("[data-page]")];
    expect(pages()).toHaveLength(2);
    expect(Math.max(...pieces().map((b) => Number(b.getAttribute("data-start-step"))))).toBeLessThan(64);
    fireEvent.click(pages()[1]);
    expect(Math.min(...pieces().map((b) => Number(b.getAttribute("data-end-step"))))).toBeGreaterThan(64);
    document.body.innerHTML = "";
    render(<Harness initial={eight} measuresPerLine={2} />);
    expect(pages()).toHaveLength(4);
    document.body.innerHTML = "";
    render(<Harness initial={eight} currentStep={100} isPlaying />);
    expect(pages()[1].getAttribute("aria-pressed")).toBe("true");
    expect(lane().getAttribute("data-playing-index")).not.toBe("");
  });

  it("lights the chord chordAt gives for the step that plays — the half measure too", () => {
    render(<Harness initial={THREE} currentStep={36} isPlaying />);
    expect(lane().getAttribute("data-playing-index")).toBe("2");
    expect(lane().getAttribute("data-playing-name")).toBe(nameOf("5"));
    expect(pieces()[2].classList.contains("is-playing")).toBe(true);
    document.body.innerHTML = "";
    render(<Harness initial={THREE} currentStep={36} isPlaying={false} />);
    expect(lane().getAttribute("data-playing-index")).toBe("");
  });

  it("a touch opens the choice; a pill replaces the chord; the first gesture copies what plays", () => {
    const onHear = vi.fn();
    render(<Harness onHear={onHear} />);
    const before = pieces().map((b) => b.getAttribute("data-chord-name"));
    fireEvent.click(pieces()[1]);
    expect(onHear).toHaveBeenCalledTimes(1);
    const choice = screen.getByTestId("chord-choice");
    const replace = within(choice).getByTestId("chord-replace");
    fireEvent.click(within(replace).getAllByRole("button")[1]); // the "2-" of the key
    const after = pieces().map((b) => b.getAttribute("data-chord-name"));
    expect(after).toEqual(before.map((name, i) => (i === 1 ? nameOf("2-") : name)));
    expect(listNow()).toHaveLength(4);
  });

  it("insert after, ½ measure, remove — each one gesture", () => {
    render(<Harness initial={[{ nns: "1", durationSteps: 16 }, { nns: "5", durationSteps: 16 }]} />);
    fireEvent.click(pieces()[0]);
    fireEvent.click(screen.getByText(translations.fr.protoA.chordInsertAfter));
    expect(listNow().map((c) => c.nns)).toEqual(["1", "1", "5"]);
    // The choice follows the inserted chord: make it half a measure.
    fireEvent.click(screen.getByText(translations.fr.protoA.chordDurationHalf));
    expect(listNow()).toEqual([{ nns: "1", durationSteps: 16 }, { nns: "1", durationSteps: 8 }, { nns: "5", durationSteps: 16 }]);
    fireEvent.click(screen.getByText(translations.fr.protoA.chordRemove));
    expect(listNow().map((c) => c.nns)).toEqual(["1", "5"]);
    expect(screen.queryByTestId("chord-choice")).toBeNull();
  });

  it("a suggested next chord is put after the touched one in one touch", () => {
    render(<Harness initial={[{ nns: "1", durationSteps: 16 }, { nns: "4", durationSteps: 16 }]} />);
    fireEvent.click(pieces()[0]);
    const suggestions = document.querySelectorAll("[data-suggestion]");
    expect(suggestions.length).toBeGreaterThan(0);
    const nns = suggestions[0].getAttribute("data-suggestion");
    fireEvent.click(suggestions[0]);
    expect(listNow().map((c) => c.nns)).toEqual(["1", nns, "4"]);
  });

  it("the length: 8 copies the chords, 1 keeps the first measure", () => {
    render(<Harness initial={THREE} />);
    fireEvent.click(lane().querySelector('[data-length="8"]'));
    expect(listNow().reduce((s, c) => s + c.durationSteps, 0)).toBe(128);
    fireEvent.click(lane().querySelector('[data-length="1"]'));
    expect(listNow()).toEqual([{ nns: "1", durationSteps: 16 }]);
    expect(lane().querySelector('[data-length="1"]').getAttribute("aria-pressed")).toBe("true");
  });

  it.each(LANGS)("speaks %s: every label of the row and the choice exists", (lang) => {
    render(<Harness initial={THREE} lang={lang} />);
    const T = translations[lang].protoA;
    expect(lane().getAttribute("aria-label")).toBe(T.chordLaneAria);
    fireEvent.click(pieces()[0]);
    for (const key of ["chordInsertAfter", "chordRemove", "chordDurationWhole", "chordDurationHalf", "chordReplaceLabel", "chordSuggestionsLabel"]) {
      expect(T[key], key).toBeTruthy();
      expect(document.body.textContent, `${lang}:${key}`).toContain(T[key]);
    }
  });
});
