import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import MixerStrip from "../MixerStrip";

/**
 * MixerStrip.test.jsx — VMU-171 (coordinator, 2026-10-03): the mixer faders
 * move in 0.5 dB steps, so a default such as guitar -1.5 dB can be reached
 * again by hand. Before, the range inputs had no `step` (the HTML default is
 * 1): the -1.5 default displayed, but the fader itself sat at a whole number
 * and could never be dragged back to -1.5.
 */
const LEVELS = { kick: -3, snare: -3, hat: -3, bass: 0, piano: -3, guitar: -1.5 };
const ORDER = ["kick", "snare", "hat", "bass", "piano", "guitar"];

function faders(container) {
  return [...container.querySelectorAll('input[type="range"]')];
}

describe("mixer faders: 0.5 dB steps (VMU-171)", () => {
  it("every fader has a 0.5 dB step", () => {
    const { container } = render(
      <MixerStrip instrumentVolumes={LEVELS} handleInstrumentVolumeChange={vi.fn()} isPlaying={false} />,
    );
    const inputs = faders(container);
    expect(inputs).toHaveLength(6);
    for (const input of inputs) expect(input.getAttribute("step")).toBe("0.5");
  });

  // Not tested here: that the guitar fader itself holds -1.5. jsdom does not
  // apply the range input's step sanitisation (a check of `input.value` was
  // green before the fix too, so it proved nothing). A real browser does;
  // scripts/tempo_probe.mjs reads the fader's own value in Chromium.

  it("moving a fader to a half-dB value reports that value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <MixerStrip instrumentVolumes={LEVELS} handleInstrumentVolumeChange={onChange} isPlaying={false} />,
    );
    const bass = faders(container)[ORDER.indexOf("bass")];
    fireEvent.change(bass, { target: { value: "-2.5" } });
    expect(onChange).toHaveBeenCalledWith("bass", "-2.5");
  });
});
