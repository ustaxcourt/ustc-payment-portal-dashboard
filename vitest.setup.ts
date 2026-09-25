import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// jsdom doesn't implement matchMedia; default to "no match" so components
// that branch on viewport width (e.g. the transaction log's filter drawer)
// render their desktop/default layout in tests.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  });
}
