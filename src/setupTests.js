import { vi, beforeEach } from 'vitest';

// The app serves the classic page when the URL has no layout parameter and the
// window is narrower than 2560 px, and A' on a desktop (src/layout.js). The
// suite was written against the classic page, so it keeps that page by default.
// A test that wants A' sets ?prototype=a itself, as PrototypeAAccess does.
// This file runs before any test file imports the application.
window.history.replaceState({}, '', '/?layout=classic');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(min-width: 2560px)' ? true : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
});

// VMU-050: the app now keeps its last selection in localStorage
// (src/utils/persistedState.js). jsdom shares one localStorage across the tests
// of a file, so without this a test's state would leak into the next test's
// first render. Cleared before every test, in every file (this file is the
// setup file of all of them).
beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* a test may have made storage unreachable */ }
});
