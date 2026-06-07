import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, // desktop by default in tests
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
});
