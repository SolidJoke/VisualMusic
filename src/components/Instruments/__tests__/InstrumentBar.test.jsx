/**
 * VMU-101 — the instrument bar (design option A, chosen 2026-09-13).
 *
 * The tile chooses; the round button inside it plays. Two gestures in one
 * object, because since #103 the keyboard shows the register of the selected
 * instrument: looking without hearing has to stay possible.
 *
 * This file covers the presentational contract only. Choosing-then-playing in
 * one gesture has its own test (`hooks/__tests__/useSelectThenPlay.test.js`),
 * because that is where the real trap is.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, within } from "@testing-library/react";
import React from "react";
import InstrumentBar from "../InstrumentBar";

const INSTRUMENTS = [
  { id: "piano", label: "Piano", range: "Do4 – Sol4" },
  { id: "guitar", label: "Guitare", range: "Do3 – Mi4" },
  { id: "bass", label: "Basse", range: "Do2 – Do3" },
];

function renderBar(overrides = {}) {
  const props = {
    instruments: INSTRUMENTS,
    selected: "guitar",
    onSelect: vi.fn(),
    onPlay: vi.fn(),
    playLabel: "Jouer",
    groupLabel: "Instrument joué",
    ...overrides,
  };
  const utils = render(<InstrumentBar {...props} />);
  return { ...utils, props };
}

afterEach(cleanup);

describe("InstrumentBar", () => {
  it("offers three distinct instruments — no merged guitar/bass choice", () => {
    // The old control read "Guit./Bass" while the state it set has three
    // distinct values. A label that names two things for one value lies.
    const { getAllByRole } = renderBar();
    const choices = getAllByRole("button", { pressed: false })
      .concat(getAllByRole("button", { pressed: true }))
      .map((b) => b.getAttribute("data-instrument"))
      .filter(Boolean)
      .sort();
    expect(choices).toEqual(["bass", "guitar", "piano"]);

    for (const { label } of INSTRUMENTS) {
      expect(label).not.toMatch(/\//);
    }
  });

  it("marks exactly the selected instrument as pressed", () => {
    const { getAllByRole } = renderBar({ selected: "bass" });
    const pressed = getAllByRole("button", { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute("data-instrument")).toBe("bass");
  });

  it("choosing a tile selects it and plays nothing", () => {
    const { getByRole, props } = renderBar({ selected: "piano" });
    fireEvent.click(getByRole("button", { name: /Basse/ , pressed: false }));
    expect(props.onSelect).toHaveBeenCalledWith("bass");
    expect(props.onPlay).not.toHaveBeenCalled();
  });

  it("the play button plays its own instrument, and does not also fire a selection", () => {
    const { getByRole, props } = renderBar({ selected: "piano" });
    fireEvent.click(getByRole("button", { name: "Jouer — Basse" }));
    expect(props.onPlay).toHaveBeenCalledTimes(1);
    expect(props.onPlay).toHaveBeenCalledWith("bass");
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("shows each instrument's register, and nothing where there is none", () => {
    const { getByRole } = renderBar({
      instruments: [
        INSTRUMENTS[0],
        INSTRUMENTS[1],
        { id: "bass", label: "Basse", range: null },
      ],
    });
    const group = getByRole("group", { name: "Instrument joué" });
    expect(within(group).getByText("Do3 – Mi4")).toBeTruthy();
    expect(within(group).getByText("Do4 – Sol4")).toBeTruthy();
    expect(group.textContent).not.toMatch(/undefined|null/);
  });

  // Which play control exists is decided in the markup, not in CSS. A phone
  // rule in App.css forces `display: inline-flex !important` on every button
  // under 768px, so hiding a button with a stylesheet silently fails there.
  // That is what the first version of this bar did: on a 390px screen it showed
  // the three round buttons AND the full-width one, and the test that stood here
  // passed, because jsdom does not apply media queries. These two assert what is
  // in the DOM, which is the only thing a unit test can see.
  it("wide: one play button per tile, and no full-width play", () => {
    const { getAllByRole, queryByTestId } = renderBar({ compact: false });
    expect(getAllByRole("button", { name: /^Jouer — / })).toHaveLength(3);
    expect(queryByTestId("instrument-bar-play-selected")).toBeNull();
  });

  it("compact: one full-width play for the selected instrument, and no per-tile play", () => {
    const { getAllByRole, getByTestId, props } = renderBar({
      compact: true,
      selected: "guitar",
    });
    expect(getAllByRole("button", { name: /^Jouer — / })).toHaveLength(1);
    fireEvent.click(getByTestId("instrument-bar-play-selected"));
    expect(props.onPlay).toHaveBeenCalledWith("guitar");
  });
});
