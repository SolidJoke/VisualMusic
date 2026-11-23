// VMU-221 — the chance bar: the mode, the help in one sentence, the seed, "Une autre version".
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChanceBar from "../ChanceBar";
import { translations } from "../../../i18n/translations";

const LANGS = ["fr", "en", "pt", "zh"];
const KEYS = ["group", "toggle", "toggleHint", "helpButton", "help", "density", "densityHint", "seedLabel", "seedHint", "another", "anotherHint", "anotherNeeds", "cellChance", "cellRemoved", "close"];

const setup = (over = {}) => {
  const props = { T: translations.fr.chance, mode: false, onMode: vi.fn(), seed: "0abc123", canVary: true, onNewVersion: vi.fn(), ...over };
  render(<ChanceBar {...props} />);
  return props;
};

describe("ChanceBar", () => {
  it("every label exists in the four languages, none empty", () => {
    for (const lang of LANGS) {
      for (const key of KEYS) {
        expect(typeof translations[lang].chance[key], `${lang}.chance.${key}`).toBe("string");
        expect(translations[lang].chance[key].length, `${lang}.chance.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("shows the seed, and the toggle is a pressed/unpressed button", () => {
    const props = setup();
    expect(screen.getByText("0abc123")).toBeTruthy();
    const mode = screen.getByRole("button", { name: props.T.toggle });
    expect(mode.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(mode);
    expect(props.onMode).toHaveBeenCalledWith(true);
  });

  it("the help opens one sentence for a beginner and closes", () => {
    const props = setup();
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: props.T.helpButton }));
    expect(screen.getByRole("note").textContent).toContain(props.T.help);
    fireEvent.click(screen.getByRole("button", { name: props.T.close }));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("'Une autre version' is disabled, and says why, while nothing is set", () => {
    const props = setup({ canVary: false });
    const button = screen.getByText(props.T.another);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("title")).toBe(props.T.anotherNeeds);
    fireEvent.click(button);
    expect(props.onNewVersion).not.toHaveBeenCalled();
  });

  it("'Une autre version' asks for a new version when something is set", () => {
    const props = setup({ canVary: true });
    fireEvent.click(screen.getByText(props.T.another));
    expect(props.onNewVersion).toHaveBeenCalledTimes(1);
  });
});
