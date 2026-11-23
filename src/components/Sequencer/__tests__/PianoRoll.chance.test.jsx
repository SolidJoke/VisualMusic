// VMU-221 — the grid shows the chance of a cell and the hits the draw removed.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PianoRoll from "../PianoRoll";
import { translations } from "../../../i18n/translations";
import { emptyChance, cycleChance, setDensity } from "../../../core/chance";

const T = translations.fr.chance;
const cell = { vel: "normal" };
const steps = (on) => Array.from({ length: 128 }, (_, i) => (on.includes(i) ? { ...cell } : null));
const snare = { id: "drum-1", name: "Snare", role: "snare", steps: steps([4, 12]) };
const chords = { id: "chords", name: "Chords", role: "chordHits", steps: steps([0]) };

const api = (over = {}) => ({
  T,
  settings: emptyChance(1),
  dropped: {},
  mode: false,
  onCycle: vi.fn(),
  onDensity: vi.fn(),
  ...over,
});
const lamps = (container) => [...container.querySelectorAll(".step-lamp")];

describe("PianoRoll without chance (the classic page, the tests)", () => {
  it("draws exactly what it drew: no chance mark, no density, nothing touchable", () => {
    const { container } = render(<PianoRoll tracks={[snare]} totalSteps={64} />);
    expect(container.querySelector("[data-chance-level]")).toBeNull();
    expect(container.querySelector("[data-dropped]")).toBeNull();
    expect(container.querySelector('[data-chance="density"]')).toBeNull();
    expect(container.querySelector(".step--touch")).toBeNull();
  });
});

describe("PianoRoll with chance", () => {
  it("marks a 50 % cell with its level, a partial veil and an accessible name", () => {
    const settings = cycleChance(emptyChance(1), "drum-1", 4);
    const { container } = render(<PianoRoll tracks={[snare]} totalSteps={64} chance={api({ settings, mode: true })} />);
    const c = lamps(container)[4];
    expect(c.getAttribute("data-chance-level")).toBe("50");
    expect(c.querySelector(".step__chance-veil").style.height).toBe("50%");
    expect(c.getAttribute("aria-label")).toMatch(/50 %/);
    expect(lamps(container)[12].getAttribute("data-chance-level")).toBeNull();
  });

  it("marks a hit the draw removed, apart from an empty cell and from a played one", () => {
    const dropped = { "drum-1": [4] };
    const played = { ...snare, steps: steps([12]) };
    const { container } = render(<PianoRoll tracks={[played]} totalSteps={64} chance={api({ dropped })} />);
    const l = lamps(container);
    expect(l[4].hasAttribute("data-dropped")).toBe(true);
    expect(l[4].classList.contains("active")).toBe(false);
    expect(l[4].title).toContain(T.cellRemoved);
    expect(l[12].classList.contains("active")).toBe(true);
    expect(l[8].hasAttribute("data-dropped")).toBe(false);
  });

  it("in Chance mode, touching a lit or removed cell cycles it; an empty cell does nothing; Enter works", () => {
    const onCycle = vi.fn();
    const played = { ...snare, steps: steps([12]) };
    const { container } = render(
      <PianoRoll tracks={[played]} totalSteps={64} chance={api({ mode: true, dropped: { "drum-1": [4] }, onCycle })} />,
    );
    const l = lamps(container);
    fireEvent.click(l[12]);
    fireEvent.click(l[4]);
    fireEvent.click(l[8]);
    fireEvent.keyDown(l[12], { key: "Enter" });
    expect(onCycle.mock.calls).toEqual([["drum-1", 12], ["drum-1", 4], ["drum-1", 12]]);
  });

  it("outside Chance mode a click changes nothing", () => {
    const onCycle = vi.fn();
    const { container } = render(<PianoRoll tracks={[snare]} totalSteps={64} chance={api({ onCycle })} />);
    fireEvent.click(lamps(container)[4]);
    expect(onCycle).not.toHaveBeenCalled();
  });

  it("a density slider per track of the roll, none for the chord row", () => {
    const onDensity = vi.fn();
    const settings = setDensity(emptyChance(1), "drum-1", 60);
    render(<PianoRoll tracks={[snare, chords]} totalSteps={64} chance={api({ settings, onDensity })} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(1);
    expect(sliders[0].value).toBe("60");
    fireEvent.change(sliders[0], { target: { value: "35" } });
    expect(onDensity).toHaveBeenCalledWith("drum-1", 35);
  });

  it("the chord row is never touchable nor marked", () => {
    const { container } = render(
      <PianoRoll tracks={[chords]} totalSteps={64} chance={api({ mode: true, settings: cycleChance(emptyChance(1), "chords", 0) })} />,
    );
    expect(container.querySelector(".step--touch")).toBeNull();
    expect(container.querySelector("[data-chance-level]")).toBeNull();
  });
});
