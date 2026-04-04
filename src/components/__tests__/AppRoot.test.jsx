import React from "react";
import { describe, it } from "vitest";
import { renderToString } from "react-dom/server";
import App from "../../App";

describe("App runtime error trap", () => {
  it("renders app without throwing", () => {
    // This will throw the exact error that causes the black screen!
    try {
      renderToString(<App />);
    } catch(e) {
      console.error("APP CRASH TRACE:", e.stack);
      throw e;
    }
  });
});
