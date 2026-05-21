import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DictFamilySelector from "../DictFamilySelector";
import { AppProvider } from "../../../context/AppContext"; // Need context for lang/txt

describe("DictFamilySelector", () => {
  it("renders the three family buttons with correct active state", () => {
    const handleFamilyChange = vi.fn();
    render(
      <AppProvider>
        <DictFamilySelector family="note" onChangeFamily={handleFamilyChange} />
      </AppProvider>
    );
    
    const noteBtn = screen.getByText(/Note/i);
    const chordBtn = screen.getByText(/Accords/i);
    const scaleBtn = screen.getByText(/Gammes/i);
    
    expect(noteBtn.className).toContain("btn-segment--active");
    expect(chordBtn.className).not.toContain("btn-segment--active");
    expect(scaleBtn.className).not.toContain("btn-segment--active");
    
    fireEvent.click(chordBtn);
    expect(handleFamilyChange).toHaveBeenCalledWith("chord");
  });
});
