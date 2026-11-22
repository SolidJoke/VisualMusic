/**
 * VMU-217 — "Copy the progression": the button puts one line on the
 * clipboard (key, tempo, one chord name per chord the row shows), in the
 * chord notation the helper displays, and says so.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import React from "react";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";

import DAWHelper from "../DAWHelper.jsx";
import { buildStudioTimeline } from "../../../core/timeline";
import { BRICKS } from "../../../core/bricks";

const indexOfStyle = (en) => BRICKS.findIndex((brick) => brick.name.en === en);

let writeText;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(cleanup);

function helper(props = {}) {
  return render(
    <DAWHelper bpm={130} genreName="X" lang="en" timeline={buildStudioTimeline({ brickIndex: 0 })} {...props} />,
  );
}

describe("DAWHelper — copy the progression", () => {
  it("copies key, tempo and the chords, US notation", async () => {
    const { getByTestId } = helper({ notation: "us" });
    fireEvent.click(getByTestId("daw-helper-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // BRICKS[0]: I-V-vi-IV in C major
    expect(writeText).toHaveBeenCalledWith("C · 130 bpm · C – G – Am – F");
  });

  it("copies in the European notation when that is the one displayed", async () => {
    const { getByTestId } = helper({ notation: "eu", lang: "fr" });
    fireEvent.click(getByTestId("daw-helper-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toBe("Do · 130 bpm · Do – Sol – Lam – Fa");
  });

  it("copies the chords the chord row shows, whatever the style", async () => {
    const index = indexOfStyle("Bossa Nova");
    const timeline = buildStudioTimeline({ brickIndex: index });
    const { getByTestId, container } = helper({ timeline, notation: "us" });
    const shown = [...container.querySelectorAll(".daw-helper__chord-name")].map((el) => el.textContent);
    fireEvent.click(getByTestId("daw-helper-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0];
    expect(text.endsWith(shown.join(" – "))).toBe(true);
    expect(text).toContain("130 bpm");
  });

  it("says Copied, in each language, then goes back to the label", async () => {
    const labels = {
      fr: ["Copier la progression", "Copié"],
      en: ["Copy the progression", "Copied"],
      pt: ["Copiar a progressão", "Copiado"],
      zh: ["复制和弦进行", "已复制"],
    };
    for (const [lang, [copy, copied]] of Object.entries(labels)) {
      const { getByTestId, unmount } = helper({ lang });
      expect(getByTestId("daw-helper-copy").textContent).toBe(copy);
      fireEvent.click(getByTestId("daw-helper-copy"));
      await waitFor(() => expect(getByTestId("daw-helper-copy").textContent).toContain(copied));
      unmount();
    }
  });

  it("reports a failure instead of pretending", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { getByTestId } = helper();
    fireEvent.click(getByTestId("daw-helper-copy"));
    await waitFor(() => expect(getByTestId("daw-helper-copy").textContent).toBe("Copy failed"));
  });

  it("is not offered without a timeline", () => {
    const { queryByTestId } = helper({ timeline: null });
    expect(queryByTestId("daw-helper-copy")).toBeNull();
  });
});
