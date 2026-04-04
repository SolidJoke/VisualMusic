import { describe, it, expect } from "vitest";
import PianoKeyboard from "../PianoKeyboard";

describe("PianoKeyboard Component", () => {
  it("exists", () => {
    expect(PianoKeyboard).toBeDefined();
    expect(typeof PianoKeyboard).toBe("function");
  });
});

